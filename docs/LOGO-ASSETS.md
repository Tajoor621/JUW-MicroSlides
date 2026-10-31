# Department artwork — JUW-MicroSlides V6.2.1

The owner supplied `public/juw-department-microscope-1254.jpeg` on 31 October 2026 and subsequently requested a clear background. The original 1,254 × 1,254 JPEG remains unmodified as the reference artwork.

The active display asset is `public/juw-department-microscope-transparent.png`, a background-extracted RGBA variant made with the image-editing tool at the original dimensions. It preserves the microscope composition and “DEPARTMENT OF MICROBIOLOGY” / “JUW” lettering visually; it is an edited bitmap, not a byte-identical original or an institutional vector master. The exterior and open background spaces are genuinely transparent. No glass texture, white square or reconstructed SVG is added.

Opening slides use the transparent PNG at the top-right, with a native-width image source hint. PPTX embeds its complete PNG bytes and alpha without resampling; PDF uses the same shared scene. The original source remains available, and the crest/seal remain SVG. Cache keys change independently of V6.2.1.

CI decodes the PNG and checks dimensions, transparent corners and visible ink, checks preview alpha and original display-byte preservation in PPTX, and captures desktop/portrait views. These checks do not establish institutional endorsement or actual Office/device qualification. Inspect physical-device results in the dated checklist; never claim them from emulation.

Image-edit prompt: remove only the white background, retaining the original microscope, colours, lettering, spacing and composition; produce a genuinely transparent high-resolution PNG without a new backplate or other decoration. The built-in image-editing path was used. An authentic vector master remains optional and has not been supplied.
