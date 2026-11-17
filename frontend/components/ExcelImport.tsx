import React, { useRef, useState } from 'react';
import { ImportResult, downloadFile } from '../lib/attendance-api';

/**
 * Excel import in three steps: pick a file, check it (nothing is saved), then import the valid rows.
 * Rows with problems are listed with their row number and can be fixed and uploaded again.
 */
export default function ExcelImport({
  title,
  help,
  templatePath,
  templateName,
  run,
  onImported,
}: {
  title: string;
  help: string;
  templatePath: string;
  templateName: string;
  run: (file: File, commit: boolean) => Promise<{ data: ImportResult }>;
  onImported?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null);
    setResult(null);
    if (input.current) input.current.value = '';
  };

  const check = async (f: File) => {
    setFile(f);
    setResult(null);
    setError('');
    setBusy(true);
    try {
      setResult((await run(f, false)).data);
    } catch (e: any) {
      setError(e.message || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setResult((await run(file, true)).data);
      onImported?.();
    } catch (e: any) {
      setError(e.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{help}</p>
        </div>
        <button type="button" onClick={() => downloadFile(templatePath, templateName).catch((e) => setError(e.message))} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Download template
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept=".xlsx" disabled={busy} onChange={(e) => e.target.files?.[0] && check(e.target.files[0])} className="text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
        {busy && <span className="text-sm text-gray-500">Working…</span>}
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          {result.committed ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
              Imported {result.importedRows} of {result.totalRows} rows.{result.errors.length > 0 && ` ${result.errors.length} row${result.errors.length > 1 ? 's were' : ' was'} skipped (listed below). Fix them and upload the file again.`}
            </p>
          ) : (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-800">
              Checked {result.totalRows} rows: <b>{result.validRows}</b> ready to import, <b>{result.errors.length}</b> with problems. Nothing is saved yet.
            </p>
          )}

          {result.calendars && result.calendars.length > 0 && (
            <ul className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700">
              {result.calendars.map((c) => (
                <li key={c.name}>{c.name}: <b>{c.rows}</b> holiday{c.rows === 1 ? '' : 's'}{c.created && <span className="ml-2 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">{result.committed ? 'new calendar created' : 'new calendar will be created'}</span>}</li>
              ))}
            </ul>
          )}

          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Problem</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.errors.map((e) => (
                    <tr key={e.row}><td className="px-3 py-2 font-mono text-gray-700">{e.row}</td><td className="px-3 py-2 text-red-700">{e.message}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            {!result.committed && result.validRows > 0 && (
              <button type="button" onClick={commit} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                Import {result.validRows} valid row{result.validRows > 1 ? 's' : ''}
              </button>
            )}
            <button type="button" onClick={reset} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {result.committed ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
