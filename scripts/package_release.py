from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
dist.mkdir(exist_ok=True)
output = dist / "meu-superdia-v1.5.0.zip"
excluded_parts = {"node_modules", "test-results", "playwright-report", "dist", ".git", "__pycache__", ".temp", "supabase", "screenshots"}

with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if path.is_dir() or any(part in excluded_parts for part in relative.parts):
            continue
        archive.write(path, Path("meu-superdia") / relative)

print(output)
