"""
Archivision Studio - Indian Architectural Prompt Engineering & Matrix
Deeply rooted in authentic Indian residential architecture, Vastu principles, and heritage materials.
Suppresses Western suburban biases in Stable Diffusion v1.5 and ControlNet.
"""

# ── Core Indian Cultural & Architectural Anchor (Applied to ALL Generations) ──
INDIAN_CULTURAL_CORE = (
    "authentic Indian residential architecture and luxury Indian home design, "
    "crafted for Indian lifestyle and Vastu-inspired spatial harmony, "
    "warm teakwood and rosewood millwork, natural Kota stone, Italian marble, or handcrafted Athangudi tiles, "
    "intricate brass inlays, traditional Indian jali lattice partitions, warm ambient cove lighting, "
    "tropical Indian indoor plants, rich textures, photorealistic architectural photography, 8k resolution"
)

# ── Comprehensive Anti-Western Negative Prompt (Suppresses Western suburban biases) ──
INDIAN_NEGATIVE_PROMPT = (
    "western architecture, American suburban house, European colonial mansion, Victorian style, "
    "pitched shingle roof, brick fireplace, chimney hearth, snow, pine trees, autumn maple leaves, "
    "western farmhouse, IKEA catalog room, drywall suburban basement, blurry, lowres, "
    "distorted proportions, bad architecture, deformed walls, floating furniture, watermark, text"
)

# ── Dynamic Room & Space Option Mappings with Authentic Indian Design Details ──
ROOM_SPACE_MAPPINGS = [
    # 1. Kitchen / Modular Kitchen
    {
        "keywords": ["modular kitchen", "kitchen"],
        "tokens": (
            "contemporary Indian modular kitchen, dedicated wet and dry cooking zones, "
            "heavy-duty chimney hood over gas cooktop, granite or quartz countertops, "
            "warm teakwood and matte laminate cabinetry, spice pull-out racks, "
            "brass and copper cookware accents, vitrified stone tile backsplash, bright task lighting"
        ),
        "is_exterior": False,
    },
    # 2. Home Theater / Media Room / Cinema
    {
        "keywords": ["home theater", "home theatre", "cinema", "media room"],
        "tokens": (
            "luxury Indian private home theater room, plush acoustic fabric wall paneling with warm wood fluted slats, "
            "stepped tiered recliner seating with rich ethnic throw cushions, concealed warm LED cove ceiling lighting, "
            "recessed starlight ceiling, dark acoustic carpet, bespoke Indian modern entertainment lounge"
        ),
        "is_exterior": False,
    },
    # 3. Living Room / Hall / Drawing Room / Baithak
    {
        "keywords": ["living", "hall", "drawing room", "baithak", "lounge"],
        "tokens": (
            "spacious Indian family living room and formal baithak, solid teakwood sofa set with handloom silk and block-print cushions, "
            "carved wooden center table, brass urli with floating marigold flowers, intricate wooden jali screen divider, "
            "marble flooring, warm chandelier lighting"
        ),
        "is_exterior": False,
    },
    # 4. Bedroom / Master Bedroom
    {
        "keywords": ["master bedroom", "bedroom", "bed room"],
        "tokens": (
            "serene Indian master bedroom, solid carved teakwood king bed with handwoven cotton and silk bedding, "
            "cane-webbing wardrobe shutters, warm terracotta and earthy neutral palette, brass bedside lamps, "
            "sheer linen curtains with warm natural daylight"
        ),
        "is_exterior": False,
    },
    # 5. Pooja Room / Mandir / Temple / Prayer Space
    {
        "keywords": ["pooja", "puja", "temple", "mandir", "prayer room", "prayer space"],
        "tokens": (
            "traditional-modern Indian pooja room, intricately carved teakwood and white marble mandir, "
            "hanging brass temple bells and oil diyas, backlit onyx or wooden jali backdrop, "
            "serene spiritual warm golden lighting, marigold garland accents"
        ),
        "is_exterior": False,
    },
    # 6. Dining Area
    {
        "keywords": ["dining"],
        "tokens": (
            "Indian family dining space, grand solid teakwood dining table with cushioned chairs, "
            "brass crockery cabinet with fluted glass, warm pendant lamps, "
            "handcrafted ceramic and copper tableware, marble flooring"
        ),
        "is_exterior": False,
    },
    # 7. Balcony / Courtyard / Aangan / Verandah
    {
        "keywords": ["courtyard", "aangan", "angan", "balcony", "verandah", "veranda", "patio"],
        "tokens": (
            "traditional-contemporary Indian central courtyard aangan and verandah, terracotta floor tiles, "
            "carved wooden pillars, traditional wooden jhula swing, lush potted tulsi, money plant, and tropical palms, "
            "warm dappled sunlight"
        ),
        "is_exterior": True,
    },
    # 8. House Exterior / Facade / Elevation / Villa
    {
        "keywords": ["exterior", "facade", "villa", "elevation", "front elevation", "architecture elevation"],
        "tokens": (
            "modern Indian luxury independent house elevation, contemporary Indian villa architecture, "
            "warm exposed brick, laterite or travertine stone cladding, teakwood main entrance door, "
            "cantilevered balconies with glass and wood railings, tropical Indian courtyard landscaping, "
            "warm evening architectural lighting"
        ),
        "is_exterior": True,
    },
]

# ── Indian-Adapted Interpretations for Architectural Style Presets ──
STYLE_PRESETS = {
    'Photorealistic': {
        'positive_suffix': (
            "Indian luxury architectural digest photography, pristine Italian marble and solid teakwood finishes, "
            "Vastu-harmonized spaces, authentic brass decor accents, warm natural ambient illumination, "
            "award winning Indian residential architecture, 8k resolution photorealistic render"
        ),
        'negative': (
            "blurry, deformed, low quality, warped walls, broken geometry, cartoon, anime, painting, "
            "sketch, watermark, ugly, distorted, bad proportions, text, logo"
        )
    },
    'Brutalism': {
        'positive_suffix': (
            "Le Corbusier and B.V. Doshi inspired Indian raw concrete and brick architecture, exposed board-formed concrete, "
            "geometric masses, deep recessed verandahs, climate-responsive shading, monumental modernist forms, 8k render"
        ),
        'negative': (
            "blurry, deformed, low quality, colorful, flimsy walls, ornate neoclassical moldings, cartoon, sketch"
        )
    },
    'Minimalist': {
        'positive_suffix': (
            "Indian contemporary minimalist with warm wood and stone, clean lines, polished Kota stone, teakwood accents, "
            "subtle brass inlays, clutter-free serene layout, diffused daylight, 8k render"
        ),
        'negative': (
            "blurry, deformed, clutter, busy, western suburban decor, cartoon, sketch, dark"
        )
    },
    'Biophilic': {
        'positive_suffix': (
            "tropical Indian courtyard greenery and natural stone, living green walls, native indoor palms, natural terracotta, "
            "exposed granite masonry, seamless indoor-outdoor transition, 8k render"
        ),
        'negative': (
            "blurry, deformed, synthetic plastic, artificial turf, sterile concrete only, cartoon, sketch"
        )
    },
    'Industrial': {
        'positive_suffix': (
            "modern Indian industrial loft with exposed clay brick, black steel, and warm teak accents, wire-cut brickwork, "
            "matte black metal frames, hand-beaten brass fixtures, polished concrete and terrazzo flooring, 8k render"
        ),
        'negative': (
            "blurry, deformed, western suburban drywall, cartoon, sketch, low quality"
        )
    },
    'Art Deco': {
        'positive_suffix': (
            "Mumbai heritage Art Deco with brass and terrazzo, geometric chevron patterns, fluted teakwood paneling, "
            "ornamental brass grillwork, polished patterned marble floors, warm opulent ambient lighting, 8k render"
        ),
        'negative': (
            "blurry, deformed, rustic farmhouse, western suburban siding, cartoon, sketch, low quality"
        )
    },
    'Futuristic': {
        'positive_suffix': (
            "contemporary Indian futuristic villa, parametric jali screens, fluid stone architecture, curved limestone planes, "
            "smart integrated LED cove lighting, sustainable climate-responsive luxury design, 8k render"
        ),
        'negative': (
            "blurry, deformed, traditional western colonial, pitched shingle roof, cartoon, sketch, low quality"
        )
    }
}

SKETCH_MODE_STRUCTURAL_ENFORCER = (
    "precise structural geometry, clean architectural lines, straight structural walls, defined floor plan, architectural accuracy"
)

# Exterior detection fallback keywords
EXTERIOR_KEYWORDS = [
    "exterior", "facade", "villa", "elevation", "courtyard", "aangan", "angan",
    "balcony", "verandah", "veranda", "patio", "outdoor", "outdoors", "landscape", "garden"
]

def clean_prompt_join(*parts: str) -> str:
    """Joins non-empty prompt parts with commas, trimming whitespace and duplicate commas."""
    tokens = []
    for part in parts:
        if part:
            cleaned = part.strip().strip(",").strip()
            if cleaned:
                tokens.append(cleaned)
    return ", ".join(tokens)

def detect_room_and_space(prompt_text: str) -> tuple[str, bool]:
    """
    Inspects user prompt for room/space keywords (case-insensitive).
    Returns (matched_room_tokens, is_exterior).
    """
    text = (prompt_text or "").lower()
    for mapping in ROOM_SPACE_MAPPINGS:
        if any(keyword in text for keyword in mapping["keywords"]):
            return mapping["tokens"], mapping["is_exterior"]

    # Fallback exterior check
    is_ext = any(keyword in text for keyword in EXTERIOR_KEYWORDS)
    return "", is_ext

def get_style_preset(preset_name: str) -> dict:
    """Retrieves style preset with case-insensitive fallback to Photorealistic."""
    if not preset_name:
        return STYLE_PRESETS['Photorealistic']
    if preset_name in STYLE_PRESETS:
        return STYLE_PRESETS[preset_name]
    lower_map = {k.lower(): v for k, v in STYLE_PRESETS.items()}
    return lower_map.get(preset_name.lower(), STYLE_PRESETS['Photorealistic'])

def build_sketch_prompt(user_prompt: str, style_preset: str, user_negative_prompt: str = "") -> tuple[str, str]:
    """
    Constructs dual-conditioned prompt for sketch mode, enriched with authentic Indian
    cultural tokens, matched room details, style preset tokens, and anti-Western negative constraints.
    Returns (full_positive_prompt, full_negative_prompt).
    """
    matched_room_tokens, is_exterior = detect_room_and_space(user_prompt)
    preset = get_style_preset(style_preset)
    
    # In sketch mode, enforce structural geometry
    style_tokens = clean_prompt_join(SKETCH_MODE_STRUCTURAL_ENFORCER, preset['positive_suffix'])
    
    # Smart Exterior vs. Interior Guardrail
    if is_exterior:
        guardrail_pos = "open sky, tropical Indian landscaping, natural daylight and architectural lighting"
        guardrail_neg = ""
    else:
        guardrail_pos = "architectural interior, indoor lighting, interior design, realistic room proportions, enclosed space"
        guardrail_neg = "sky, exterior, outdoor landscape, building facade, clouds, open grass, outdoor trees, open roof"

    # Positive Assembly: f"{user_prompt}, {matched_room_tokens}, {style_preset_tokens}, {INDIAN_CULTURAL_CORE}"
    full_positive = clean_prompt_join(
        user_prompt,
        matched_room_tokens,
        guardrail_pos,
        style_tokens,
        INDIAN_CULTURAL_CORE
    )

    # Negative Assembly: f"{user_negative_prompt}, {INDIAN_NEGATIVE_PROMPT}"
    full_negative = clean_prompt_join(
        user_negative_prompt,
        preset.get('negative', ''),
        guardrail_neg,
        INDIAN_NEGATIVE_PROMPT
    )

    return full_positive, full_negative

def build_text_prompt(user_prompt: str, style_preset: str, user_negative_prompt: str = "") -> tuple[str, str]:
    """
    Constructs prompt for text mode, enriched with authentic Indian cultural tokens,
    matched room details, style preset tokens, and anti-Western negative constraints.
    Returns (full_positive_prompt, full_negative_prompt).
    """
    matched_room_tokens, is_exterior = detect_room_and_space(user_prompt)
    preset = get_style_preset(style_preset)
    style_tokens = preset['positive_suffix']

    # Smart Exterior vs. Interior Guardrail
    if is_exterior:
        guardrail_pos = "open sky, tropical Indian landscaping, natural daylight and architectural lighting"
        guardrail_neg = ""
    else:
        guardrail_pos = "architectural interior, indoor lighting, interior design, realistic room proportions, enclosed space"
        guardrail_neg = "sky, exterior, outdoor landscape, building facade, clouds, open grass, outdoor trees, open roof"

    full_positive = clean_prompt_join(
        user_prompt,
        matched_room_tokens,
        guardrail_pos,
        style_tokens,
        INDIAN_CULTURAL_CORE
    )

    full_negative = clean_prompt_join(
        user_negative_prompt,
        preset.get('negative', ''),
        guardrail_neg,
        INDIAN_NEGATIVE_PROMPT
    )

    return full_positive, full_negative
