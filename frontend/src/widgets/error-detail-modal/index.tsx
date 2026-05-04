import { useEffect, useState, type ReactNode } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Spinner } from '@heroui/react';
import { getErrorDetail } from '../../shared/api/client';
import type { ErrorDetail } from '../../entities/error/types';

interface Props {
  id: string | null;
  onClose: () => void;
}

export function ErrorDetailModal({ id, onClose }: Props) {
  const [detail, setDetail] = useState<ErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setDetail(null); setError(null); return; }
    let cancelled = false;
    setLoading(true); setError(null); setDetail(null);
    getErrorDetail(id)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => { if (!cancelled) setError(e?.response?.status === 404 ? 'Not found' : (e?.message ?? String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <Modal isOpen={!!id} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Error detail</ModalHeader>
        <ModalBody className="pb-6">
          {loading && <Spinner />}
          {error && <div className="text-danger">{error}</div>}
          {detail && (
            <div className="space-y-3">
              <Field label="Message"><div className="font-mono text-sm">{detail.message}</div></Field>
              <Field label="Endpoint">{detail.endpoint || '—'}</Field>
              <Field label="Region">{detail.region || '—'}</Field>
              <Field label="Time">{new Date(detail.timestamp).toLocaleString()}</Field>
              <Field label="Stack trace">
                <pre className="bg-default-100 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                  {detail.stack_trace || 'no stack trace'}
                </pre>
              </Field>
              <Field label="Preceding actions">
                {detail.preceding_actions.length === 0 ? (
                  <div className="text-default-500 text-sm">No preceding actions recorded</div>
                ) : (
                  <ol className="space-y-1 text-sm list-decimal pl-5">
                    {detail.preceding_actions.map((a, i) => (
                      <li key={i}>
                        {a.type === 'click' ? (
                          <>click on <code className="text-xs">{a.target}</code></>
                        ) : (
                          <>navigation: <code className="text-xs">{a.from}</code> → <code className="text-xs">{a.to}</code></>
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
