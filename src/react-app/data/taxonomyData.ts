import type { ObservedPath, Sophistication, Stage, StageId } from '../types/killchain'

export const STAGE_ORDER: StageId[] = ['TA', 'AC', 'AR', 'DL']

export const sophisticationOrder: Sophistication[] = ['Low', 'Medium', 'High', '—']

export const taxonomy: Stage[] = [
  {
    stage: "Target Acquisition",
    id: "TA",
    color: "#3b82f6",
    description: "The attacker decides which identity to use and begins gathering assets.",
    techniques: [
      {
        name: "External Face Acquisition",
        id: "TA-01",
        desc: "Outside attacker passively collects a face image from publicly accessible or compromised sources — no direct interaction with the target",
        descShort: "Passively collect a face from public/compromised sources",
        subtechniques: [
          "Google or social media search for a usable face image",
          "Use photo extracted from a found, stolen, or purchased identity document",
          "Use publicly shared KYC bypass content (TikTok, YouTube, Discord — videos of others completing verification)",
          "Fictional character or stock-image exploits (e.g. Sam Bridges from Death Stranding found to pass KYC)",
          "Purchase ready-made identity package (face + matching forged documents) from dark web",
          "Screen replay of shared video from a content platform",
          "Screenshot + virtual injection of publicly shared artifact",
          "Access target's device, cloud account, or social media for personal photos"
        ]
      },
      {
        name: "Verification Flow Phishing",
        id: "TA-02",
        desc: "Attacker actively engages a victim through a fake verification flow to harvest verification-quality selfies and ID images",
        descShort: "Active phishing for verification-quality selfies",
        subtechniques: [
          "Fake IdV flow impersonating a real provider (e.g. fake Persona/Onfido/Jumio onboarding)",
          "Fraudulent onboarding for a fake service collecting selfie + ID",
          "Social engineering victim into 'verify your account to keep using it'",
          "Crypto/fintech scam flows that capture KYC content as a side effect",
          "Phished selfies are usable directly (verification-quality framing) OR can feed downstream AC/AR techniques"
        ]
      },
      {
        name: "Unauthorized Proxy Verification",
        id: "TA-03",
        desc: "Attacker has proximity-based or social access to a real person whose identity is being verified — friend, family, sleeping subject",
        descShort: "Proximity-based identity use (friend, family, sleeping subject)",
        subtechniques: [
          "Spouse/partner pointing camera at photo of absent partner",
          "Child holding up parent's photo to selfie camera (age-verification bypass)",
          "Friend FaceTime: friend points camera at live FaceTime call with another friend (account-sharing scenario, with permission)",
          "Capture sleeping/unaware person's face (e.g. kid sneaking into parent's bedroom with the verification device)",
          "Take a photo of unaware person earlier, replay later via screen",
          "Pointing selfie camera at photo frame, printed photo, or device displaying the person's image",
          "Family member using borrowed document + photo (with or without verbal permission)"
        ]
      },
      {
        name: "Identity Fabrication",
        id: "TA-04",
        desc: "Entirely fabricated identity with no real source person. Either AI-synthetic face + forged documents, or a physically-constructed persona",
        descShort: "Fabricated identity",
        subtechniques: [
          "AI-generated face + forged documents (synthetic identity)",
          "Composite identity: real name from leaked data + AI-synthetic face",
          "Fully fictitious AI persona with generated supporting artifacts (driver's license photo, social media history, etc.)",
          "Physically-constructed persona: heavy disguise (wig + makeup + glasses + facial hair) + forged ID with portrait matching the disguised appearance",
          "Hybrid: AI-generated reference face used to design a physical disguise, with both used in tandem"
        ]
      },
      {
        name: "Identity Muling",
        id: "TA-05",
        desc: "Real person knowingly provides their identity for fraudulent use by others",
        descShort: "Real person knowingly provides their identity for misuse",
        subtechniques: ["Paid identity rental for account creation", "Coerced participation", "Account selling after legitimate verification"]
      },
      {
        name: "Self-Fraud",
        id: "TA-06",
        desc: "Attacker uses their own real identity fraudulently — no impersonation, just abuse of legitimate verification access",
        descShort: "Attacker abuses their own legitimate identity",
        subtechniques: [
          "Multiple account creation with real selfie (against ToS)",
          "Age/attribute falsification with real face — kid using own face but adding mustache/wig/glasses to defeat age prediction (paired with AR-07)",
          "Verification farming across platforms"
        ]
      }
    ]
  },
  {
    stage: "Asset Creation",
    id: "AC",
    color: "#8b5cf6",
    description: "The attacker obtains, creates, or alters a selfie for the attack.",
    techniques: [
      {
        name: "No Generation",
        id: "AC-01",
        desc: "Genuine photo, video, or live capture used directly without AI modification",
        descShort: "Genuine photo/video used directly, no AI",
        subtechniques: [
          "Raw stolen photo submitted as-is",
          "Phished verification selfie replayed without modification",
          "Publicly shared KYC artifact reused",
          "Live person on FaceTime as the source",
          "Real selfie of self (Self-Fraud) or of mule (Identity Muling)",
          "Live capture of unaware proxy subject (sleeping parent, etc.)"
        ]
      },
      {
        name: "Physical Fabrication",
        id: "AC-02",
        desc: "Physical object created to present to camera — paper, fabric, 3D objects",
        descShort: "Physical object: paper, mask, doll, ID-portrait",
        subtechniques: ["Wallet-size or 8x11 printed photo", "Cutout mounted on stick/dowel", "Mask: silicone, resin, 3D-printed, fabric pull-over (shiesty-style)", "Mannequin/doll", "ID portrait shown directly off the document"]
      },
      {
        name: "Face Swap",
        id: "AC-03",
        desc: "Target identity transferred onto a source face via AI",
        descShort: "AI face swap onto a source face",
        subtechniques: ["Autoencoder-based (DeepFaceLab)", "GAN-based (SimSwap, FaceDancer)", "Diffusion-based (DiffSwap, REFace)", "Commercial app (Reface, FaceApp)", "Real-time (DeepLiveCam, Roop)", "Document photo used as source identity for swap"]
      },
      {
        name: "Full Face Synthesis",
        id: "AC-04",
        desc: "Entirely AI-generated face, optionally conditioned on a reference identity",
        descShort: "AI-generated face from scratch",
        subtechniques: ["GAN-generated (StyleGAN, ProGAN)", "Diffusion-generated (Stable Diffusion, DALL-E)", "ID-consistent generation (ConsistentID, PuLID, InstantID)", "Prompt-driven (IP-Adapter)", "Document photo used as conditioning input"]
      },
      {
        name: "Lookalike Matching",
        id: "AC-05",
        desc: "Real face of a different person selected for biometric similarity to stolen identity",
        descShort: "Real biometric-similar person stands in",
        subtechniques: ["Manual lookalike recruitment matching stolen ID", "Automated face similarity search against databases", "Partial resemblance supplemented with makeup/styling"]
      },
      {
        name: "Inpainting / Outpainting",
        id: "AC-06",
        desc: "Partial face or background region regenerated or extended",
        descShort: "Partial regeneration of face or background",
        subtechniques: ["Face region inpainting to repair artifacts from other creation methods", "Background outpainting to simulate realistic capture environment", "Feature-specific inpainting (eyes, mouth, nose)", "Document photo face replacement via inpainting"]
      }
    ]
  },
  {
    stage: "Asset Refinement",
    id: "AR",
    color: "#ef4444",
    description: "The attacker uses different techniques to alter the selfie and attempt to evade detection. (Skip this optional step)",
    techniques: [
      {
        name: "Artifact Suppression",
        id: "AR-01",
        desc: "REMOVE traces of fraud — eliminate generation/fabrication artifacts that detectors look for",
        descShort: "Remove generation/fabrication artifacts",
        subtechniques: ["REMOVE blending boundary seams", "REMOVE GAN frequency artifacts", "REMOVE low-resolution tells via super-resolution", "REMOVE compositing cutlines", "REMOVE moiré patterns", "REMOVE color discontinuities at boundaries"]
      },
      {
        name: "Noise Injection",
        id: "AR-02",
        desc: "ADD characteristics of real camera capture",
        descShort: "Add real-camera capture characteristics",
        subtechniques: ["ADD sensor noise matching phone camera profile", "ADD fixed-pattern noise", "ADD film grain", "ADD lens vignetting", "ADD chromatic aberration", "ADD motion blur"]
      },
      {
        name: "Compression Manipulation",
        id: "AR-03",
        desc: "Exploit lossy compression to destroy forensic traces",
        descShort: "Lossy compression to destroy forensic traces",
        subtechniques: ["JPEG recompression at specific quality levels", "Re-encoding through different codecs", "Multiple-generation lossy cycle", "WebP/HEIC format conversion"]
      },
      {
        name: "Color & Lighting Matching",
        id: "AR-04",
        desc: "Manipulate color/lighting profile of asset OR physical environment to evade detection",
        descShort: "Digital or physical color/lighting manipulation",
        subtechniques: [
          "[Digital] White balance correction",
          "[Digital] Skin tone matching",
          "[Digital] Ambient lighting simulation",
          "[Digital] Shadow consistency correction",
          "[Digital] Contrast/brightness normalization",
          "[Physical] Capture in dark/low-light environment to mask physical mask edges (shiesty-style fabric mask in unlit room)",
          "[Physical] Stage capture environment (background, lighting direction)",
          "[Physical] Use ambient lighting matching texture/reflectance of fraud asset"
        ]
      },
      {
        name: "Resolution & Format Matching",
        id: "AR-05",
        desc: "Adjust technical characteristics to match expected device output",
        descShort: "Match expected device output specs",
        subtechniques: ["Downscale to phone camera resolution", "Crop to expected aspect ratio", "Bit depth adjustment", "Orientation/rotation matching"]
      },
      {
        name: "Metadata Sanitization",
        id: "AR-06",
        desc: "Remove or forge non-visual metadata that could reveal the fraud",
        descShort: "Strip or spoof non-visual metadata",
        subtechniques: ["EXIF stripping", "EXIF spoofing", "Timestamp manipulation", "GPS coordinate injection", "Software fingerprint removal"]
      },
      {
        name: "Physical Disguise",
        id: "AR-07",
        desc: "Subject alteration — wigs, makeup, drawn-on facial hair, glasses, occlusions, costumes",
        descShort: "Subject alteration: wigs, makeup, occlusions",
        subtechniques: [
          "Drawn-on facial hair (mustache, beard) to defeat age prediction (kids beating age assurance)",
          "Wigs to alter perceived age, gender, or identity",
          "Glasses, hats, or facial occlusions to throw off the detector",
          "Makeup to alter perceived age (prosthetic aging or de-aging)",
          "Full costumed persona: wig + glasses + makeup combined with matching forged ID portrait",
          "Multi-element disguise for full alternate persona"
        ]
      },
      {
        name: "Geometric Transformation",
        id: "AR-08",
        desc: "Spatial transformations applied to defeat hash-based detection or inflate apparent asset diversity — preserves visual content while disrupting exact pixel layout",
        descShort: "Spatial transforms to evade hash-based detection",
        subtechniques: [
          "Horizontal flip / mirror — preserves all visual semantics for face detectors while changing every pixel hash; most common in observed deepfake variant clusters",
          "Slight rotation (1–3° tilts) to defeat exact-match perceptual hashing",
          "Subtle scale or translation (off-center crop) preserving face landmarks but shifting framing",
          "Affine warping (mild) — more aggressive geometric perturbation, risks visible distortion",
          "Combined geometric + recompression to compound hash-evasion (often paired with AR-03)"
        ]
      }
    ]
  },
  {
    stage: "Delivery",
    id: "DL",
    color: "#f59e0b",
    description: "The attacker submits the selfie to the selfie verification request system.",
    techniques: [
      {
        name: "Physical Presentation",
        id: "DL-01",
        desc: "Physical object held in front of the device camera",
        descShort: "Object held in front of device camera",
        subtechniques: ["Handheld printed photo", "Mounted photo on stand/tripod", "Mask worn on face", "Doll/mannequin positioned at camera", "Subject themselves (with or without disguise)", "Live person held in proximity (sleeping parent, FaceTime person on a different device)"]
      },
      {
        name: "Screen Replay",
        id: "DL-02",
        desc: "Image or video displayed on a screen to the capture camera",
        descShort: "Content displayed on a screen to camera",
        subtechniques: ["Phone screen to phone camera", "Monitor/TV to phone camera", "Tablet replay", "Live FaceTime feed shown on screen", "High-refresh-rate display to minimize moiré", "OLED display for superior color/contrast fidelity"]
      },
      {
        name: "Virtual Camera Injection",
        id: "DL-03",
        desc: "Software intercepts camera feed and substitutes content",
        descShort: "Software intercepts and replaces camera feed",
        subtechniques: ["OBS Virtual Camera", "ManyCam / CamTwist", "Custom virtual camera driver", "Modified camera HAL on rooted device", "Dimension mismatch artifacts visible at edges"]
      },
      {
        name: "API / SDK Injection",
        id: "DL-04",
        desc: "Fraud material submitted directly to verification endpoint, bypassing camera",
        descShort: "Direct submission to endpoint, bypassing camera",
        subtechniques: ["Direct API call with crafted image payload", "Modified mobile SDK bypassing camera capture", "Man-in-the-middle replacement of captured image", "Session replay attack"]
      },
      {
        name: "Device Compromise",
        id: "DL-05",
        desc: "The capture device itself is compromised to bypass integrity checks",
        descShort: "Compromised device with hooked camera APIs",
        subtechniques: ["Rooted/jailbroken device with hooked camera API", "Emulated device environment", "Custom ROM with modified camera stack", "Instrumentation frameworks (Xposed, Frida) hooking camera calls"]
      }
    ]
  }
];

export const observedPaths: ObservedPath[] = [
  { id: "p1", techniques: ["TA-01", "AC-01", "DL-02"], desc: "Externally-acquired face → use as-is → point selfie camera at another screen showing the image", sophistication: "Low" },
  { id: "p2", techniques: ["TA-01", "AC-01", "DL-01"], desc: "Externally-acquired face → print it → hold printout in front of camera", sophistication: "Low" },
  { id: "p3", techniques: ["TA-01", "AC-02", "DL-01"], desc: "Externally-acquired face → fabricate physical prop (printed photo, paper mask, cutout-on-stick, ID-portrait-off-document) → present to camera", sophistication: "Low" },
  { id: "p4", techniques: ["TA-03", "AC-01", "DL-01"], desc: "Proxy verification, physical: kid points device at sleeping parent / spouse points at photo of absent partner / live FaceTime person held next to camera", sophistication: "Low" },
  { id: "p17", techniques: ["TA-03", "AC-01", "DL-02"], desc: "Proxy verification, screen replay: friend FaceTime feed displayed on screen / photo of sleeping parent replayed on screen", sophistication: "Low" },
  { id: "p5", techniques: ["TA-06", "AC-01", "AR-07", "DL-01"], desc: "Self-fraud + physical disguise — kid uses own identity but adds drawn mustache, wig, or glasses to defeat age prediction", sophistication: "Low" },
  { id: "p6", techniques: ["TA-04", "AC-01", "AR-07", "DL-01"], desc: "Costumed-persona attack — fabricated identity, real face heavily disguised (wig, makeup, glasses), forged ID matching the disguised appearance, present as the new identity", sophistication: "Medium" },
  { id: "p7", techniques: ["TA-01", "AC-02", "AR-04", "DL-01"], desc: "Mask + dark-room staging — wear shiesty-style mask, capture in low-light so dark mask edges blend with surroundings (AR-04 in physical mode)", sophistication: "Medium" },
  { id: "p8", techniques: ["TA-01", "AC-01", "DL-03"], desc: "Externally-acquired face → use as-is → inject via virtual camera (OBS, ManyCam)", sophistication: "Medium" },
  { id: "p9", techniques: ["TA-01", "AC-01", "DL-04"], desc: "Externally-acquired face → use as-is → submit directly via API/SDK injection", sophistication: "Medium" },
  { id: "p15", techniques: ["TA-02", "AC-01", "DL-03"], desc: "Phished selfie → use as-is (verification-quality, no modification needed) → inject via virtual camera", sophistication: "Medium" },
  { id: "p16", techniques: ["TA-02", "AC-01", "DL-04"], desc: "Phished selfie → use as-is → submit directly via API/SDK injection", sophistication: "Medium" },
  { id: "p10", techniques: ["TA-01", "AC-03", "DL-03"], desc: "Externally-acquired face → apply face swap (Roop, DeepFaceLive) → inject via virtual camera", sophistication: "Medium" },
  { id: "p11", techniques: ["TA-01", "AC-03", "AR-01", "AR-02", "DL-03"], desc: "External face → face swap → remove blending seams + add camera noise → virtual camera inject", sophistication: "High" },
  { id: "p12", techniques: ["TA-04", "AC-04", "AR-01", "AR-02", "AR-03", "DL-03"], desc: "Synthetic identity → AI-generate face from scratch → suppress artifacts + add noise + recompress → virtual camera", sophistication: "High" },
  { id: "p13", techniques: ["TA-02", "AC-06", "AR-04", "DL-04"], desc: "Phish selfie → inpaint background → digitally color-match to expected environment → API inject", sophistication: "High" },
  { id: "p14", techniques: ["TA-01", "AC-03", "DL-05"], desc: "External face → face swap → inject via rooted device / emulator / Frida hooks bypassing camera API", sophistication: "High" },
  { id: "p18", techniques: ["TA-01", "AC-03", "AR-03", "AR-08", "DL-03"], desc: "Face-swap variant cluster — base swap + horizontal flips + recompression to inflate apparent diversity and evade hash-based detection (observed in deepfake variant clusters)", sophistication: "High" },
  { id: "p19", techniques: ["TA-04", "AC-04", "AR-03", "AR-08", "DL-03"], desc: "Full-synthesis variant cluster — single AI-generated identity expanded into many hash-distinct submissions via flip + recompress", sophistication: "High" },
  { id: "p20", techniques: ["TA-02", "AC-06", "AR-03", "AR-08", "DL-04"], desc: "Inpainting variant cluster — phished base + inpainted regions + flip + recompress to multiply apparent identities for credential stuffing", sophistication: "High" },
  { id: "p21", techniques: ["TA-01", "AC-03", "AR-01", "AR-02", "AR-08", "DL-03"], desc: "Face swap with full evasion stack — suppress artifacts + add noise + flip for hash evasion → virtual camera", sophistication: "High" },
  { id: "p22", techniques: ["TA-04", "AC-04", "AR-01", "AR-02", "AR-03", "AR-08", "DL-03"], desc: "Full synthesis with maximum evasion — suppress + noise + recompress + flip → virtual camera", sophistication: "High" },
  { id: "s1", techniques: ["TA-05", "AC-01", "DL-01"], desc: "Identity mule does real verification with their own face — visually indistinguishable from legitimate", sophistication: "—", signalOnly: true },
  { id: "s2", techniques: ["TA-01", "AC-05", "DL-01"], desc: "Find real lookalike matching stolen document → real selfie of real (lookalike) person", sophistication: "—", signalOnly: true }
];
