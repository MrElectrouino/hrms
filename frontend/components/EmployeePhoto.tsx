import React, { useEffect, useRef, useState } from 'react';
import { PHOTO_MAX_BYTES, getEmployeePhotoUrl, uploadEmployeePhoto } from '../lib/api';

const ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';

/** Client-side check mirroring the API rule (BR-MD-09). The API re-checks type, signature and size. */
export function photoProblem(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!/\.(jpe?g|png)$/.test(name)) return 'Choose a .jpg, .jpeg or .png file.';
  if (file.size > PHOTO_MAX_BYTES) return 'The photo must be smaller than 10 MB.';
  return null;
}

const CameraIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

/**
 * Round employee photo with initials fallback.
 * - With `employeeId`: loads the saved photo and, when `canEdit`, uploads a new one on pick.
 * - Without `employeeId` (new employee): `onStage` receives the picked file to upload after creation.
 */
export default function EmployeePhoto({
  employeeId,
  initials,
  canEdit,
  hasPhoto = true,
  onStage,
  onUploaded,
  size = 64,
}: {
  employeeId?: number;
  initials: string;
  canEdit: boolean;
  hasPhoto?: boolean;
  onStage?: (file: File | null) => void;
  onUploaded?: () => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  // Load the saved photo (protected endpoint, so it is fetched with the token, not <img src>).
  useEffect(() => {
    if (!employeeId || !hasPhoto) return;
    let alive = true;
    let objectUrl: string | null = null;
    getEmployeePhotoUrl(employeeId)
      .then((u) => {
        objectUrl = u;
        if (alive) setUrl(u);
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employeeId, hasPhoto, version]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    const problem = photoProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    if (!employeeId) {
      // New employee: preview now, upload after the record is created.
      setUrl(URL.createObjectURL(file));
      onStage?.(file);
      return;
    }
    setBusy(true);
    try {
      await uploadEmployeePhoto(employeeId, file);
      setVersion((v) => v + 1);
      onUploaded?.();
    } catch (err: any) {
      setError(err.message || 'Could not upload the photo');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const dim = { width: size, height: size };
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="group relative rounded-full" style={dim}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Employee photo" className="h-full w-full rounded-full object-cover ring-1 ring-gray-200" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">{initials}</div>
        )}

        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-gray-900/0 text-white opacity-0 transition group-hover:bg-gray-900/45 group-hover:opacity-100 focus:bg-gray-900/45 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={url ? 'Change photo' : 'Upload photo'}
              title={url ? 'Change photo' : 'Upload photo'}
            >
              <CameraIcon className="h-5 w-5" />
            </button>
            <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm">
              <CameraIcon className="h-3 w-3" />
            </span>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        )}
      </div>
      {canEdit && (
        <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-medium text-blue-600 hover:text-blue-700">
          {url ? 'Change photo' : 'Upload photo'}
        </button>
      )}
      {error && <p className="max-w-[160px] text-center text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
