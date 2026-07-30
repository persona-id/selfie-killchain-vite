const HF_DATASET = "saatvikbilla1/persona-fas-preview";

/** Representative preview image per technique from the Persona FAS preview dataset. */
export const TECHNIQUE_HF_PATHS: Record<string, string> = {
  "TA-01": "replicas/id_portraits/screen_replay/fake-1.jpg",
  "TA-02": "replicas/kyc_video/fake-1.jpg",
  "TA-03": "replicas/id_portraits/physical/fake-1.jpg",
  "TA-04": "replicas/ai_generated/fake-1.jpg",
  "TA-05": "replicas/id_portraits/physical/fake-10.jpg",
  "TA-06": "replicas/id_portraits/physical/fake-5.jpg",
  "AC-01": "replicas/id_portraits/physical/fake-1.jpg",
  "AC-02": "masks/fake-1.jpg",
  "AC-03": "synthetic/face_swap/unrefined/fake-15.png",
  "AC-04": "synthetic/full_face_synthesis/imagen4/fake-1024.png",
  "AC-05": "replicas/id_portraits/physical/fake-20.jpg",
  "AC-06":
    "synthetic/partial_modification/face_inpainting/artifact_suppression/compression_manipulation/fake-13.jpg",
  "AR-01": "synthetic/face_swap/artifact_suppression/compression_manipulation/fake-1.jpg",
  "AR-02": "synthetic/face_swap/noise_injection/compression_manipulation/fake-14.jpg",
  "AR-03": "synthetic/face_swap/compression_manipulation/fake-14.jpg",
  "AR-04":
    "synthetic/face_swap/color_lighting_matching/artifact_suppression/compression_manipulation/fake-1.jpg",
  "AR-05":
    "synthetic/face_swap/resolution_format_matching/artifact_suppression/compression_manipulation/fake-1.jpg",
  "AR-06": "replicas/id_portraits/physical/fake-30.jpg",
  "AR-07": "masks/fake-10.jpg",
  "AR-08": "synthetic/face_swap/compression_manipulation/fake-14.jpg",
  "DL-01": "dolls_and_mannequins/fake-1.jpg",
  "DL-02": "replicas/screen_replays/fake-1.jpg",
  "DL-03": "replicas/screen_replays/fake-50.jpg",
  "DL-04": "synthetic/face_swap/unrefined/fake-15.png",
  "DL-05": "replicas/screen_replays/fake-100.jpg",
};

/** Extra dataset previews with unique filenames for matrix deduplication fallbacks. */
const MATRIX_PREVIEW_FALLBACK_PATHS = [
  "dolls_and_mannequins/fake-100.png",
  "dolls_and_mannequins/fake-101.png",
  "dolls_and_mannequins/fake-102.png",
  "dolls_and_mannequins/fake-103.png",
  "dolls_and_mannequins/fake-104.png",
  "dolls_and_mannequins/fake-105.png",
  "dolls_and_mannequins/fake-106.png",
  "dolls_and_mannequins/fake-107.jpg",
  "dolls_and_mannequins/fake-108.jpg",
  "dolls_and_mannequins/fake-11.jpg",
  "dolls_and_mannequins/fake-12.jpg",
  "dolls_and_mannequins/fake-15.jpg",
  "dolls_and_mannequins/fake-16.jpg",
  "dolls_and_mannequins/fake-17.jpg",
  "dolls_and_mannequins/fake-18.jpg",
  "dolls_and_mannequins/fake-19.jpg",
  "dolls_and_mannequins/fake-2.jpg",
  "dolls_and_mannequins/fake-21.jpg",
  "dolls_and_mannequins/fake-22.jpg",
  "dolls_and_mannequins/fake-23.jpg",
  "dolls_and_mannequins/fake-24.jpg",
  "dolls_and_mannequins/fake-25.jpg",
  "masks/fake-11.jpg",
  "masks/fake-12.jpg",
  "masks/fake-2.jpg",
  "replicas/id_portraits/physical/fake-11.jpg",
  "replicas/id_portraits/physical/fake-12.jpg",
  "replicas/id_portraits/physical/fake-2.jpg",
  "replicas/id_portraits/physical/fake-3.jpg",
  "replicas/id_portraits/physical/fake-4.jpg",
] as const;

function previewRelAssetKey(rel: string): string {
  return rel.split("/").pop()?.toLowerCase() ?? rel.toLowerCase();
}

function buildMatrixPreviewRelPaths(): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];

  const add = (rel: string) => {
    const key = previewRelAssetKey(rel);
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(rel);
  };

  for (const rel of Object.values(TECHNIQUE_HF_PATHS)) add(rel);
  for (const rel of MATRIX_PREVIEW_FALLBACK_PATHS) add(rel);

  return pool;
}

const MATRIX_PREVIEW_REL_PATHS = buildMatrixPreviewRelPaths();

const HF_DATASET_MARKER = `/datasets/${HF_DATASET}/resolve/main/`;

export function techniqueImageUrl(techniqueId: string): string | null {
  return techniqueHfResolveUrl(techniqueId);
}

export function techniqueHfResolveUrl(techniqueId: string): string | null {
  const rel = TECHNIQUE_HF_PATHS[techniqueId];
  if (!rel) return null;
  return hfDatasetUrl(rel);
}

function hfDatasetUrl(rel: string): string {
  return `https://huggingface.co${HF_DATASET_MARKER}${rel}`;
}

export function previewImageUrl(rel: string): string {
  return hfDatasetUrl(rel);
}

/** Stable key for deduping visually identical dataset assets (e.g. fake-1.jpg reused across folders). */
export function imageAssetKey(url: string): string {
  const markerIndex = url.indexOf(HF_DATASET_MARKER);
  const datasetPath =
    markerIndex >= 0
      ? url.slice(markerIndex + HF_DATASET_MARKER.length)
      : (() => {
          try {
            return new URL(url).pathname.replace(/^\//, "");
          } catch {
            return url;
          }
        })();

  const filename = datasetPath.split("/").pop() ?? datasetPath;
  return filename.toLowerCase();
}

const ALL_TECHNIQUE_IDS = Object.keys(TECHNIQUE_HF_PATHS).sort();

export function pickUniqueTechniqueImageUrl(
  techniqueId: string,
  usedAssetKeys: Set<string>,
  preferredUrl?: string | null,
): string | null {
  const accept = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const key = imageAssetKey(url);
    if (usedAssetKeys.has(key)) return null;
    return url;
  };

  const primary = preferredUrl ?? techniqueImageUrl(techniqueId);
  const chosen = accept(primary);
  if (chosen) return chosen;

  const stagePrefix = techniqueId.match(/^[A-Z]+/)?.[0] ?? "";
  for (const id of ALL_TECHNIQUE_IDS.filter((candidate) => candidate.startsWith(stagePrefix))) {
    const candidate = accept(techniqueHfResolveUrl(id));
    if (candidate) return candidate;
  }

  for (const id of ALL_TECHNIQUE_IDS) {
    const candidate = accept(techniqueHfResolveUrl(id));
    if (candidate) return candidate;
  }

  for (const rel of MATRIX_PREVIEW_REL_PATHS) {
    const candidate = accept(previewImageUrl(rel));
    if (candidate) return candidate;
  }

  return null;
}
