const LABELS: Record<string, string> = {
  dolls_and_mannequins: 'Physical doll or mannequin presentation attack',
  masks: 'Wearable face mask presentation attack',
  ai_generated: 'AI-generated replica stand-in',
  id_portraits: 'ID document portrait replay',
  kyc_video: 'KYC video frame replay',
  physical_photo: 'Printed physical photo replay',
  screen_replays: 'Screen replay capture',
  face_swap: 'Face swap synthesis',
  full_face_synthesis: 'Full face synthesis',
  partial_modification: 'Partial face modification',
  unrefined: 'unrefined output',
  artifact_suppression: 'blending seams removed',
  color_lighting_matching: 'color and lighting matched',
  compression_manipulation: 'compression applied',
  noise_injection: 'camera noise added',
  resolution_format_matching: 'resolution and format matched',
  diffusion_flux: 'diffusion flux generator',
  gan_stylegan2: 'StyleGAN2 generator',
  imagen4: 'Imagen 4 generator',
  openai_gpt_image_1: 'GPT Image 1 generator',
  openai_gpt_image_1_5: 'GPT Image 1.5 generator',
  openai_gpt_image_2: 'GPT Image 2 generator',
  face_inpainting: 'face inpainting',
  background_outpainting: 'background outpainting',
}

function label(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ')
}

export function descriptionForPhysical(category: string, relPath: string): string {
  if (category === 'dolls_and_mannequins' || category === 'masks') {
    return label(category)
  }

  const parts = relPath.split('/')
  const sub = parts[1]
  if (sub) return `${label(sub)} captured for presentation attack`
  return 'Replica presentation attack'
}

export function descriptionForSynthetic(
  acTop: string,
  acSubtype: string,
  arSet: string[],
): string {
  const base = label(acTop)
  const subtype = acSubtype && acSubtype !== acTop ? ` via ${label(acSubtype)}` : ''
  const refinements = arSet
    .filter((ar) => ar !== 'unrefined' && ar !== 'ar_unspecified')
    .map((ar) => label(ar))

  if (refinements.length === 0) {
    return `${base}${subtype}`
  }

  return `${base}${subtype} with ${refinements.join(', ')}`
}
