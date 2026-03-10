import io
import pdfplumber

async def parse_pdf_to_markdown(pdf_bytes: bytes, filename: str) -> str:
    """
    Parses a PDF file bytes and extracts the 4x2 flashcard layout into Markdown.
    """
    try:
        # Load PDF from bytes
        markdown_output = [f"---\ndeck: {filename.replace('.pdf', '')}\n---\n"]
        
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                # Placeholder for actual extraction logic which will be refined next
                # Try simple text extraction first
                text = page.extract_text()
                
                if not text or len(text.strip()) == 0:
                    # PDF is likely an image or vector without embedded text objects
                    # Need OCR or AI Vision processing here
                    markdown_output.append(f"<!-- Page {i+1}: OCR required (Not implemented yet) -->\n")
                    continue
                
                # If text exists, we process it (fallback plan)
                # This logic assumes the PDF text is cleanly extractable
                markdown_output.append(text)
                
        return "\n".join(markdown_output)
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        raise e
