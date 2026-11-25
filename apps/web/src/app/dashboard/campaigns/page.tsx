'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  ChevronRight,
  ExternalLink,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { CampaignItem, CampaignDetail } from '../../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Drawer } from '../../../components/ui/Drawer';
import { Skeleton } from '../../../components/ui/Skeleton';
import { SearchBar } from '../../../components/ui/SearchBar';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCampaigns();
      setCampaigns(res.data || []);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleOpenDetail = async (id: string) => {
    setSelectedCampaignId(id);
    setIsLoadingDetail(true);
    try {
      const res = await api.getCampaign(id);
      setCampaignDetail(res.data);
    } catch {
      // Ignored
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filtered = campaigns.filter(
    (c) =>
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.body.toLowerCase().includes(search.toLowerCase())
  );

  const formatLocalTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Campaigns
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your cold email campaigns, inspect delivery rates, and review recipient batches.
          </p>
        </div>

        <Link href="/compose">
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs py-2 px-3.5 shadow-md shadow-indigo-500/20"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="max-w-md flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search campaigns by subject or body..."
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCampaigns}
          className="border-neutral-200 dark:border-neutral-800 text-xs rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Campaigns List Table/Cards */}
      <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {search ? 'No matching campaigns' : 'No campaigns created yet'}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {search ? 'Try clearing your search query.' : 'Click "New Campaign" above to draft and schedule your first batch.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => handleOpenDetail(c.id)}
                className="p-4 sm:p-5 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {c.subject}
                    </h3>
                    <Badge
                      variant={
                        c.status === 'completed'
                          ? 'sent'
                          : c.status === 'scheduled'
                          ? 'scheduled'
                          : 'primary'
                      }
                      size="sm"
                    >
                      {c.status || 'Active'}
                    </Badge>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Created {formatLocalTime(c.created_at)}</span>
                    <span>&bull;</span>
                    <span>{c.total} recipients</span>
                    <span>&bull;</span>
                    <span>{c.delay_seconds}s stagger interval</span>
                    <span>&bull;</span>
                    <span>Cap: {c.hourly_limit}/hr</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-28 sm:w-36 text-right">
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {c.sent}/{c.total}
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {c.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Campaign Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedCampaignId)}
        onClose={() => {
          setSelectedCampaignId(null);
          setCampaignDetail(null);
        }}
        title={campaignDetail?.subject || 'Campaign Details'}
        description={
          campaignDetail
            ? `Created ${formatLocalTime(campaignDetail.created_at)} &bull; ${campaignDetail.total} recipients`
            : 'Loading...'
        }
      >
        {isLoadingDetail || !campaignDetail ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Total</span>
                <p className="text-lg font-black text-neutral-900 dark:text-white">{campaignDetail.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Sent</span>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{campaignDetail.sent}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-600">Pending</span>
                <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{campaignDetail.scheduled}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Email Template
              </span>
              <div
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-800 dark:text-neutral-200 max-h-48 overflow-y-auto prose dark:prose-invert prose-xs"
                dangerouslySetInnerHTML={{ __html: campaignDetail.body }}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Recipients ({campaignDetail.emails?.length || 0})
              </span>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-800 max-h-72 overflow-y-auto">
                {campaignDetail.emails?.map((em) => (
                  <div
                    key={em.id}
                    onClick={() => router.push(`/dashboard/email/${em.id}`)}
                    className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                        {em.recipient}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {em.status === 'sent' ? `Sent at ${formatLocalTime(em.sent_at || em.scheduled_at)}` : `Scheduled: ${formatLocalTime(em.scheduled_at)}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          em.status === 'sent'
                            ? 'sent'
                            : em.status === 'scheduled'
                            ? 'scheduled'
                            : 'failed'
                        }
                        size="sm"
                      >
                        {em.status}
                      </Badge>
                      {em.preview_url && (
                        <a
                          href={em.preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
