import sys
import pdfplumber

def check_pdf(path):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[0]
        text = page.extract_text()
        print("EXTRACTION RESULT:")
        print(text)

if __name__ == "__main__":
    check_pdf("../SHRM Flashcard Test Sample.pdf")
