import { useEffect, useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Modal } from './Modal';

export function BarcodeScanner({
  onCode,
}: {
  onCode: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onCode);
  callback.current = onCode;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    setError('');
    void import('@zxing/browser')
      .then(async ({ BrowserMultiFormatReader }) => {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            'Caméra indisponible. Saisissez le code dans le champ.',
          );
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video.current!,
          (result) => {
            if (result && !cancelled) {
              callback.current(result.getText());
              setOpen(false);
            }
          },
        );
        if (cancelled) controls.stop();
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'Impossible d’ouvrir la caméra. Autorisez son accès ou saisissez le code manuellement.',
          );
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [open]);
  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        <ScanBarcode size={18} /> Scanner
      </button>
      {open && (
        <Modal title="Scanner un code-barres" onClose={() => setOpen(false)}>
          <p>Présentez le code-barres face à la caméra.</p>
          <video ref={video} className="scanner-video" muted playsInline />
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
