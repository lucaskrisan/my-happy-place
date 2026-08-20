import { useRef, useState } from "react";
import { uid } from "./studioState";
import {
  type PermanentUploadResult,
  type UploadStatus,
  uploadPermanentAsset,
} from "./permanentUpload";

const accepted = "video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,image/jpeg,image/png,image/webp";

export function R2UploadProof() {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [assetId, setAssetId] = useState(() => uid("asset"));
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("waiting");
  const [result, setResult] = useState<PermanentUploadResult | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);

  const upload = async () => {
    if (!file || !token.trim()) {
      setError("Informe o token temporário e escolha um arquivo permitido.");
      return;
    }
    setError("");
    setResult(null);
    controller.current = new AbortController();
    try {
      const uploaded = await uploadPermanentAsset({
        funnelId: "r2-upload-proof",
        assetId,
        file,
        token,
        signal: controller.current.signal,
        onProgress: (value, nextStatus) => {
          setProgress(value);
          setStatus(nextStatus);
        },
      });
      setResult(uploaded);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar o arquivo.");
    } finally {
      controller.current = null;
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <section className="mx-auto grid max-w-2xl gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <h1 className="text-xl font-bold">R2 UPLOAD PROOF</h1>
          <p className="text-sm text-zinc-400">Prova técnica temporária. O token fica apenas na memória desta aba.</p>
        </div>
        <label className="grid gap-1 text-sm">Token temporário de autoria<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" /></label>
        <label className="grid gap-1 text-sm">Asset ID<input value={assetId} onChange={(event) => setAssetId(event.target.value)} /></label>
        <label className="grid gap-1 text-sm">Arquivo permitido<input type="file" accept={accepted} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        {file && <p className="text-xs text-zinc-400">{file.name} · {file.type || "tipo ausente"} · {file.size} bytes</p>}
        <div className="flex gap-2"><button onClick={() => void upload()} disabled={!file || status === "uploading"}>ENVIAR PARA R2</button><button onClick={() => controller.current?.abort()} disabled={status !== "uploading"}>CANCELAR</button></div>
        <p aria-live="polite">{status.toUpperCase()} · {progress}%</p>
        {error && <p className="text-red-400">{error}</p>}
        {result && <div className="grid gap-2 rounded border border-emerald-700 p-3"><b>AssetRef permanente criado</b><a className="text-blue-400 underline" href={result.src} target="_blank" rel="noreferrer">ABRIR /media/*</a><pre className="overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>{result.contentType.startsWith("video/") && <video className="max-h-80" controls src={result.src} />}{result.contentType.startsWith("audio/") && <audio controls src={result.src} />}{result.contentType.startsWith("image/") && <img className="max-h-80" src={result.src} alt={result.filename} />}</div>}
      </section>
    </main>
  );
}
