import sys
import pdfplumber

def analyze_pdf(path):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[0]
        
        print("Page size:", page.width, page.height)
        
        # We assume 4 flashcards on left, 4 answers on right
        width = page.width
        height = page.height
        
        # Crop left half
        left_crop = page.crop((0, 0, width / 2, height))
        right_crop = page.crop((width / 2, 0, width, height))
        
        print("\n--- LEFT Crop (Topics/Questions) ---")
        print(left_crop.extract_text())
        
        print("\n--- RIGHT Crop (Answers) ---")
        print(right_crop.extract_text())

if __name__ == "__main__":
    analyze_pdf("../SHRM Flashcard Test Sample.pdf")
