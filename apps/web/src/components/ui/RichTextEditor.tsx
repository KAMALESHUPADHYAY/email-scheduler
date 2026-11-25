import React, { useRef, useEffect } from 'react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Quote,
  Heading1,
  Heading2,
  Type,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type Your Reply...',
  className,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChangeRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChangeRef.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChangeRef.current = true;
      const html = editorRef.current.innerHTML;
      const plainText = editorRef.current.innerText;
      onChange(html, plainText);
    }
  };

  const exec = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  return (
    <div className={twMerge(clsx('flex flex-col border border-neutral-200 rounded-card bg-white overflow-hidden', className))}>
      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="w-full min-h-[220px] p-4 text-xs sm:text-sm text-neutral-800 focus:outline-none overflow-y-auto font-sans leading-relaxed"
        style={{ minHeight: '220px' }}
      />

      {/* Figma Bottom Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-t border-neutral-200 bg-neutral-50/70 select-none">
        <button
          type="button"
          onClick={() => exec('undo')}
          title="Undo"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('redo')}
          title="Redo"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-200 mx-1" />

        <button
          type="button"
          onClick={() => exec('formatBlock', '<p>')}
          title="Normal Text"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Type className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<h2>')}
          title="Heading"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-200 mx-1" />

        <button
          type="button"
          onClick={() => exec('bold')}
          title="Bold (Ctrl+B)"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded font-bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          title="Italic (Ctrl+I)"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          title="Underline (Ctrl+U)"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('strikeThrough')}
          title="Strikethrough"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded line-through"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-200 mx-1" />

        <button
          type="button"
          onClick={() => exec('justifyLeft')}
          title="Align Left"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('justifyCenter')}
          title="Align Center"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('justifyRight')}
          title="Align Right"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-200 mx-1" />

        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          title="Bullet List"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          title="Numbered List"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-200 mx-1" />

        <button
          type="button"
          onClick={() => exec('outdent')}
          title="Outdent"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Outdent className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('indent')}
          title="Indent"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Indent className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<blockquote>')}
          title="Quote"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
