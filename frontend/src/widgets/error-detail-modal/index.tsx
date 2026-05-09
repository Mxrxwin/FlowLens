import { useEffect, useState, type ReactNode } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Spinner } from '@heroui/react';
import { useT } from '../../shared/i18n';
import { getErrorDetail } from '../../shared/api/client';
import type { ErrorDetail } from '../../entities/error/types';

interface Props {
  id: string | null;
  onClose: () => void;
}

export function ErrorDetailModal({ id, onClose }: Props) {
  const t = useT();
  const [detail, setDetail] = useState<ErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setDetail(null); setError(null); return; }
    let cancelled = false;
    setLoading(true); setError(null); setDetail(null);
    getErrorDetail(id)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => { if (!cancelled) setError(e?.response?.status === 404 ? t('errorDetail.notFound') : (e?.message ?? String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <Modal isOpen={!!id} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('errorDetail.title')}</ModalHeader>
        <ModalBody className="pb-6">
          {loading && <Spinner />}
          {error && <div className="text-danger">{error}</div>}
          {detail && (
            <div className="space-y-3">
              <Field label={t('errorDetail.message')}><div className="font-mono text-sm">{detail.message}</div></Field>
              <Field label={t('errorDetail.endpoint')}>{detail.endpoint || '—'}</Field>
              <Field label={t('errorDetail.region')}>{detail.region || '—'}</Field>
              <Field label={t('errorDetail.time')}>{new Date(detail.timestamp).toLocaleString()}</Field>
              <Field label={t('errorDetail.stackTrace')}>
                <pre className="bg-default-100 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                  {detail.stack_trace || t('errorDetail.noStackTrace')}
                </pre>
              </Field>
              <Field label={t('errorDetail.precedingActions')}>
                {detail.preceding_actions.length === 0 ? (
                  <div className="text-default-500 text-sm">{t('errorDetail.noActions')}</div>
                ) : (
                  <ol className="space-y-1 text-sm list-decimal pl-5">
                    {detail.preceding_actions.map((a, i) => (
                      <li key={i}>
                        {a.type === 'click' ? (
                          <>{t('errorDetail.clickOn')} <code className="text-xs">{a.target}</code></>
                        ) : (
                          <>{t('errorDetail.navigation')} <code className="text-xs">{a.from}</code> → <code className="text-xs">{a.to}</code></>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Field>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-default-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
