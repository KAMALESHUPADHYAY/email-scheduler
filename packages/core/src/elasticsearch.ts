import { Client } from '@elastic/elasticsearch';
import { config } from './config';
import { logger } from './logger';
import { EmailSearchResult, EmailSearchResponse } from './types';

let esClient: Client | null = null;
let isEsAvailable = false;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    const clientOptions: any = {
      node: config.ELASTICSEARCH_URL,
    };

    if (config.ELASTICSEARCH_API_KEY) {
      clientOptions.auth = { apiKey: config.ELASTICSEARCH_API_KEY };
    } else if (config.ELASTICSEARCH_USERNAME && config.ELASTICSEARCH_PASSWORD) {
      clientOptions.auth = {
        username: config.ELASTICSEARCH_USERNAME,
        password: config.ELASTICSEARCH_PASSWORD,
      };
    }

    esClient = new Client(clientOptions);
  }
  return esClient;
}

export async function initElasticsearchIndex(): Promise<boolean> {
  const client = getElasticsearchClient();
  try {
    const exists = await client.indices.exists({ index: config.ELASTICSEARCH_INDEX });
    if (!exists) {
      await client.indices.create({
        index: config.ELASTICSEARCH_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            campaign_id: { type: 'keyword' },
            sender_id: { type: 'keyword' },
            recipient: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
            subject: { type: 'text' },
            body: { type: 'text' },
            scheduled_at: { type: 'date' },
            sent_at: { type: 'date' },
            status: { type: 'keyword' },
            preview_url: { type: 'keyword', index: false },
            error: { type: 'text' },
            created_at: { type: 'date' },
          },
        },
      });
      logger.info(`Elasticsearch index '${config.ELASTICSEARCH_INDEX}' created successfully.`);
    }
    isEsAvailable = true;
    return true;
  } catch (error) {
    logger.warn({ error }, 'Elasticsearch index initialization warning (Elasticsearch may be offline or unreachable).');
    isEsAvailable = false;
    return false;
  }
}

export async function indexEmailDocument(
  email: {
    id: string;
    campaign_id: string;
    sender_id: string;
    recipient: string;
    subject: string;
    body: string;
    scheduled_at: Date | string;
    sent_at?: Date | string | null;
    status: string;
    preview_url?: string | null;
    error?: string | null;
    created_at: Date | string;
  },
  userId?: string
): Promise<void> {
  try {
    const client = getElasticsearchClient();
    await client.index({
      index: config.ELASTICSEARCH_INDEX,
      id: email.id,
      document: {
        id: email.id,
        user_id: userId || null,
        campaign_id: email.campaign_id,
        sender_id: email.sender_id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        scheduled_at: new Date(email.scheduled_at).toISOString(),
        sent_at: email.sent_at ? new Date(email.sent_at).toISOString() : null,
        status: email.status,
        preview_url: email.preview_url || null,
        error: email.error || null,
        created_at: new Date(email.created_at).toISOString(),
      },
      refresh: 'wait_for',
    });
    logger.debug({ emailId: email.id, userId }, 'Indexed email document in Elasticsearch');
  } catch (error) {
    logger.warn({ error, emailId: email.id }, 'Soft failure indexing email document in Elasticsearch');
  }
}

export async function searchEmailsInES(params: {
  query: string;
  userId: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<EmailSearchResponse | null> {
  try {
    const client = getElasticsearchClient();
    const { query, userId, status, limit = 20, offset = 0 } = params;

    const mustClauses: any[] = [];
    const filterClauses: any[] = [
      { term: { user_id: userId } }, // Strict per-user isolation in ES
    ];

    if (query && query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
          fields: ['recipient^3', 'subject^2', 'body'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    if (status && status !== 'all') {
      filterClauses.push({
        term: { status },
      });
    }

    const response = await client.search({
      index: config.ELASTICSEARCH_INDEX,
      from: offset,
      size: limit,
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
      sort: [{ scheduled_at: { order: 'desc' } }],
    });

    const totalHits =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value || 0;

    const emails = response.hits.hits.map((hit: any) => hit._source);

    return {
      total: totalHits,
      emails,
    };
  } catch (error) {
    logger.warn({ error }, 'Elasticsearch search failure; returning null for DB fallback');
    return null;
  }
}
