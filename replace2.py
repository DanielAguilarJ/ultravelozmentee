import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements based on exact or case-insensitive matching
    replacements = [
        (r'(?i)Validez\s+Oficial\s+SEP\s+bajo\s+Acuerdo\s+286\.', 'Preparación para Admisión y Regularización.'),
        (r'(?i)Validez\s+Oficial\s+SEP', 'Preparación para Admisión y Regularización'),
        (r'(?i)Licenciatura\s+con\s+validez\s+SEP', 'Licenciatura de preparación para admisión'),
        (r'(?i)Certificación\s+Oficial\s+SEP', 'Preparación para Admisión y Regularización'),
        (r'(?i)Certificación\s+SEP', 'Preparación para Admisión'),
        (r'(?i)respaldo\s+SEP', 'preparación para admisión'),
        (r'(?i)credencial\s+SEP', 'preparación para admisión'),
        (r'(?i)Garantía\s+SEP', 'Garantía de Preparación'),
        (r'(?i)Simulador\s+SEP\s+avanzado', 'Simulador de Admisión avanzado'),
        (r'(?i)Programa\s+oficial\s+SEP\s+completo', 'Programa de preparación para admisión completo'),
        (r'(?i)validez\s+SEP', 'preparación para admisión'),
        (r'(?i)oficial\s+SEP', 'preparación para admisión'),
        (r'(?i)\bSEP\b\s*\(\s*Secretaría\s*de\s*Educación\s*Pública\s*\)', 'instituciones educativas oficiales'),
        (r'(?i)Validez\s+SEP', 'Preparación para Admisión'),
        (r'(?i)la\s+SEP', 'las instituciones educativas'),
        (r'(?i)\bSEP\b', 'Admisión')
    ]
    
    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for root, _, files in os.walk('.'):
    # Only process html files outside of node_modules etc if there are any
    if 'node_modules' in root.split(os.sep) or '.git' in root.split(os.sep): 
        continue
    for file in files:
        if file.endswith('.html'):
            process_file(os.path.join(root, file))
