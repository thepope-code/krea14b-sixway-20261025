# Krea 14B eight-way comparison

Eight original 1664×960 MP4s, 30 seconds / 480 frames / 16 fps, and two 832×480 Native Base audits. No transcoding. The original six videos and public URL are preserved. Videos 07–08 use the new prompt beginning “A 30-second video of…” and share a newly generated Base; they do not use the original Base. SHA-256 receipts and comparison boundaries are included in manifest.json and the page. Technical validation does not imply perceptual quality.

Drag, arrow buttons and keyboard controls reorder the cards without changing experiment IDs. Existing six-video browser preferences are retained, with the new pair appended. Direct MP4 playback uses independent buffering, not pre-downloaded Blobs.

Tests: `node --test order.test.mjs manifest.test.mjs`.
