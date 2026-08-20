# Studio R2 upload (C1)

The temporary authoring endpoint is `PUT /api/studio/assets/upload`. It is disabled until the Worker has the server-side secret `STUDIO_UPLOAD_TOKEN`.

When the next approved deployment is prepared, set the secret interactively (never in a file or Git):

```powershell
npx wrangler secret put STUDIO_UPLOAD_TOKEN
```

The C1 proof route is `/dev/r2-upload-proof`. The author supplies the token directly to that page; it remains in browser memory only and is sent exclusively in the `Authorization: Bearer ...` header.

Uploads accept only the media MIME types implemented in `src/server.ts` and are limited to 90 MiB. The Worker streams the raw request body into the existing `FUNNEL_MEDIA` binding and returns a same-origin `/media/...` URL. Uploads above that limit need a future direct/presigned or multipart upload flow; C1 deliberately does not implement that flow.

## Asset Manager (C2)

The Studio stores only permanent URLs and asset metadata in `FunnelDefinition.assets`. A local file is a browser-only preview and is marked for reattachment after a reload. The temporary authoring token is kept only in `sessionStorage`, never in the funil definition or localStorage. Replacing an uploaded file creates a new versioned R2 object while preserving the asset ID and all of its references. Removing an asset from the project does not delete its remote R2 object; remote cleanup is deliberately deferred to C4.
