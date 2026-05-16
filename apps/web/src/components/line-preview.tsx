'use client';

interface LinePreviewProps {
  messages: LineMessage[];
  botName?: string;
}

type LineMessage =
  | { type: 'text'; text: string }
  | { type: 'image'; originalContentUrl: string; previewImageUrl?: string }
  | { type: 'template'; altText?: string; template: TemplateMessage }
  | { type: 'flex'; altText?: string; contents: Record<string, unknown> };

interface TemplateMessage {
  type: 'buttons' | 'carousel' | 'confirm';
  thumbnailImageUrl?: string;
  title?: string;
  text?: string;
  columns?: CarouselColumn[];
  actions?: TemplateAction[];
}

interface CarouselColumn {
  thumbnailImageUrl?: string;
  title?: string;
  text: string;
  actions: TemplateAction[];
}

interface TemplateAction {
  type: string;
  label: string;
  uri?: string;
  text?: string;
  data?: string;
}

function ActionButton({ action }: { action: TemplateAction }) {
  return (
    <div className="text-center py-2 text-[11px] font-medium text-[#06C755] border-t border-[#e5e5e5] hover:bg-[#f5f5f5] cursor-default">
      {action.label}
    </div>
  );
}

function ButtonsPreview({ template }: { template: TemplateMessage }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-[#e5e5e5] max-w-[220px]">
      {template.thumbnailImageUrl && (
        <div className="w-full h-28 bg-slate-200 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={template.thumbnailImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {template.title && (
        <div className="px-3 pt-2 text-[12px] font-bold text-[#333] leading-tight">{template.title}</div>
      )}
      <div className="px-3 py-2 text-[11px] text-[#666] leading-relaxed whitespace-pre-wrap">{template.text}</div>
      {template.actions?.map((action, i) => (
        <ActionButton key={i} action={action} />
      ))}
    </div>
  );
}

function CarouselPreview({ template }: { template: TemplateMessage }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 max-w-[280px]">
      {template.columns?.map((col, i) => (
        <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-[#e5e5e5] min-w-[180px] max-w-[180px] flex-shrink-0">
          {col.thumbnailImageUrl && (
            <div className="w-full h-24 bg-slate-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={col.thumbnailImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {col.title && (
            <div className="px-2.5 pt-1.5 text-[11px] font-bold text-[#333] leading-tight truncate">{col.title}</div>
          )}
          <div className="px-2.5 py-1.5 text-[10px] text-[#666] leading-relaxed line-clamp-3">{col.text}</div>
          {col.actions?.map((action, j) => (
            <ActionButton key={j} action={action} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ConfirmPreview({ template }: { template: TemplateMessage }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-[#e5e5e5] max-w-[220px]">
      <div className="px-3 py-3 text-[11px] text-[#666] leading-relaxed whitespace-pre-wrap">{template.text}</div>
      <div className="flex">
        {template.actions?.map((action, i) => (
          <div key={i} className="flex-1 text-center py-2 text-[11px] font-medium text-[#06C755] border-t border-[#e5e5e5]">
            {action.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: LineMessage }) {
  if (message.type === 'text') {
    return (
      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm max-w-[240px] text-[13px] leading-relaxed text-[#333] whitespace-pre-wrap break-words">
        {message.text}
      </div>
    );
  }

  if (message.type === 'image') {
    return (
      <div className="rounded-lg overflow-hidden shadow-sm max-w-[180px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={message.originalContentUrl} alt="" className="w-full" />
      </div>
    );
  }

  if (message.type === 'template') {
    const tpl = message.template;
    if (tpl.type === 'buttons') return <ButtonsPreview template={tpl} />;
    if (tpl.type === 'carousel') return <CarouselPreview template={tpl} />;
    if (tpl.type === 'confirm') return <ConfirmPreview template={tpl} />;
  }

  if (message.type === 'flex') {
    return (
      <div className="bg-white rounded-lg p-3 shadow-sm border border-[#e5e5e5] max-w-[220px] text-[11px] text-[#666]">
        Flex Message
      </div>
    );
  }

  return null;
}

export function LinePreview({ messages, botName = 'LinQ for Beauty' }: LinePreviewProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="bg-[#7494C0] rounded-xl p-4 min-h-[200px] flex items-center justify-center">
        <p className="text-white/60 text-xs">メッセージを入力するとプレビューが表示されます</p>
      </div>
    );
  }

  return (
    <div className="bg-[#7494C0] rounded-xl p-4 min-h-[200px] space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="h-8 w-8 rounded-full bg-[#06C755] flex items-center justify-center text-white text-[10px] font-bold">
          LQ
        </div>
        <span className="text-[11px] text-white/80 font-medium">{botName}</span>
      </div>

      {messages.map((msg, i) => (
        <div key={i} className="flex gap-1.5">
          <div className="w-8" />
          <MessageBubble message={msg} />
        </div>
      ))}
    </div>
  );
}

interface MessageDataInput {
  thumbnailImageUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  text?: string;
  actions?: TemplateAction[];
  columns?: Array<{
    thumbnailImageUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    text?: string;
    actions?: TemplateAction[];
  }>;
}

export function templateToLineMessages(
  messageType: string,
  content: string,
  messageData: MessageDataInput | null | undefined,
): LineMessage[] {
  if (messageType === 'text' || !messageData) {
    return [{ type: 'text', text: content }];
  }

  if (messageType === 'buttons') {
    return [{
      type: 'template',
      template: {
        type: 'buttons',
        thumbnailImageUrl: messageData.thumbnailImageUrl || messageData.thumbnailUrl,
        title: messageData.title,
        text: messageData.text || content,
        actions: messageData.actions || [],
      },
    }];
  }

  if (messageType === 'carousel') {
    return [{
      type: 'template',
      template: {
        type: 'carousel',
        columns: (messageData.columns || []).map((col) => ({
          thumbnailImageUrl: col.thumbnailImageUrl || col.thumbnailUrl,
          title: col.title,
          text: col.text || '',
          actions: col.actions || [],
        })),
      },
    }];
  }

  if (messageType === 'confirm') {
    return [{
      type: 'template',
      template: {
        type: 'confirm',
        text: messageData.text || content,
        actions: messageData.actions || [],
      },
    }];
  }

  return [{ type: 'text', text: content }];
}

export type { LineMessage, TemplateAction, MessageDataInput };
