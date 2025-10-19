import os
os.makedirs('Assets', exist_ok=True)  # Ensure folder
import matplotlib.pyplot as plt
from PIL import Image
import io

def generate_icon(size, filename, main_text, dot_text, ai_text):
    fig, ax = plt.subplots(figsize=(size/100, size/100), dpi=200 if size < 32 else 100)
    ax.set_xlim(0, size)
    ax.set_ylim(0, size)
    ax.set_facecolor('#00308F')  # Blue bg
    ax.axis('off')
    
    # Main text (white, adjusted fs/pos)
    fs_main = size*0.3 if size < 32 else size*0.2
    ax.text(size*0.2, size/2, main_text, fontsize=fs_main, ha='left', va='center', color='white', fontweight='bold')
    
    # Yellow dot, better pos
    fs_dot = size*0.25 if size < 32 else size*0.2
    ax.text(size*0.45, size/2, dot_text, fontsize=fs_dot, color='#FFD700', ha='center', va='center')
    
    # Blue AI, adjusted
    fs_ai = size*0.25 if size < 32 else size*0.15
    ax.text(size*0.65, size/2, ai_text, fontsize=fs_ai, color='#00BFFF', ha='center', va='center')
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0, transparent=False, dpi=200 if size < 32 else 100)
    buf.seek(0)
    img = Image.open(buf)
    img.save(filename, 'PNG')
    plt.close()

# Generate
generate_icon(16, 'Assets/icon-16.png', 'T', '.', 'AI')
generate_icon(32, 'Assets/icon-32.png', 'TR', '.', 'AI')
generate_icon(80, 'Assets/icon-80.png', 'TrueRun', '.', 'AI')
print("Clean branded icons generated in Assets/")