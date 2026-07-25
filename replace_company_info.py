import re
import glob

html_files = glob.glob('*.html')
count = 0

old_str = r"WorldBrain Corporativo Educativo S\.A\. de C\.V\.\s*\|\s*RFC:\s*XXXXXXXX\s*\|\s*Domicilio:\s*Ciudad de México\."
new_str = "CWBMX, S.C. | RFC: CWB170626UH4 | Domicilio: Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano, Cuautitlán Izcalli, Edo. de Méx., C.P. 54700"

for filepath in html_files:
    if filepath == 'googleb3cccf1efd67c490.html': continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = re.sub(old_str, new_str, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1
        print(f"✅ Updated {filepath}")

print(f"\nDone! Modified {count} files.")
