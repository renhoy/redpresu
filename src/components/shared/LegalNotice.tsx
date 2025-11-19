interface LegalNoticeProps {
  legalNotice: string;
}

export function LegalNotice({ legalNotice }: LegalNoticeProps) {
  return (
    <div className="p-6 bg-white rounded-lg border">
      <div
        className="prose prose-sm max-w-none text-gray-600"
        dangerouslySetInnerHTML={{ __html: legalNotice }}
      />
    </div>
  );
}
