"use client";

import { useMemo, useState } from "react";

type Artifacts = {
  pageSpec: any;
  divi: {
    header: Record<string, unknown>;
    body: Record<string, unknown>;
    footer: Record<string, unknown>;
  };
  css: string;
  summary: string;
  warnings: string[];
};

function downloadText(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [specDraft, setSpecDraft] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const canGenerate = useMemo(() => Boolean(specDraft.trim()), [specDraft]);

  async function onAnalyze() {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("mockup", file);
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setArtifacts(data);
      setSpecDraft(JSON.stringify(data.pageSpec, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerate() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSpec: JSON.parse(specDraft) })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setArtifacts(data);
      setSpecDraft(JSON.stringify(data.pageSpec, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>OpenDraft: AI Mockup → Divi Draft</h1>
      <p>Upload a homepage mockup to generate an editable Divi-ready draft. The result is a starting point, not a pixel-perfect clone.</p>

      <section className="panel">
        <h2>1) Upload</h2>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setArtifacts(null);
            setSpecDraft("");
            if (selected) {
              setPreviewUrl(URL.createObjectURL(selected));
            } else {
              setPreviewUrl("");
            }
          }}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <button disabled={!file || busy} onClick={onAnalyze}>{busy ? "Analyzing..." : "Analyze Mockup"}</button>
        </div>
        {previewUrl && (
          <div style={{ marginTop: "1rem" }}>
            <img src={previewUrl} alt="Uploaded mockup preview" style={{ width: "100%", maxHeight: 400, objectFit: "contain", border: "1px solid #dbe2ef" }} />
          </div>
        )}
      </section>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {artifacts && (
        <>
          <section className="panel">
            <h2>2) Interpretation Results & Review</h2>
            <div className="grid">
              <div>
                <h3>Header Interpretation</h3>
                <pre>{JSON.stringify(artifacts.pageSpec.globalRegions.header, null, 2)}</pre>
                <h3>Footer Interpretation</h3>
                <pre>{JSON.stringify(artifacts.pageSpec.globalRegions.footer, null, 2)}</pre>
              </div>
              <div>
                <h3>Interpreted Sections</h3>
                <pre>{JSON.stringify(artifacts.pageSpec.sections, null, 2)}</pre>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>3) Editable Page Spec</h2>
            <textarea value={specDraft} onChange={(event) => setSpecDraft(event.target.value)} rows={20} />
            <div style={{ marginTop: "0.75rem" }}>
              <button disabled={!canGenerate || busy} onClick={onRegenerate}>{busy ? "Generating..." : "Generate Artifacts from Edited Spec"}</button>
            </div>
          </section>

          <section className="panel">
            <h2>4) Export Draft Files</h2>
            <p><strong>Build summary:</strong> {artifacts.summary}</p>
            <h3>Warnings / confidence notes</h3>
            <ul>
              {artifacts.warnings.length === 0 ? <li>No warnings.</li> : artifacts.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button onClick={() => downloadText("intermediate-page-spec.json", JSON.stringify(artifacts.pageSpec, null, 2))}>Download Spec JSON</button>
              <button onClick={() => downloadText("divi-homepage-body.json", JSON.stringify(artifacts.divi.body, null, 2))}>Download Body JSON</button>
              <button onClick={() => downloadText("divi-global-header.json", JSON.stringify(artifacts.divi.header, null, 2))}>Download Header JSON</button>
              <button onClick={() => downloadText("divi-global-footer.json", JSON.stringify(artifacts.divi.footer, null, 2))}>Download Footer JSON</button>
              <button onClick={() => downloadText("opendraft-companion.css", artifacts.css, "text/css")}>Download CSS</button>
              <button onClick={() => downloadText("build-summary.txt", `${artifacts.summary}\n\nWarnings:\n${artifacts.warnings.join("\n")}`, "text/plain")}>Download Notes</button>
            </div>

            <div className="grid" style={{ marginTop: "1rem" }}>
              <div>
                <h3>Generated CSS Preview</h3>
                <pre>{artifacts.css}</pre>
              </div>
              <div>
                <h3>Generated Divi JSON Preview</h3>
                <pre>{JSON.stringify(artifacts.divi, null, 2)}</pre>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
