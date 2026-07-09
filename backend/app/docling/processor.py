import os

# Disable progress bars (tqdm) — they crash under uvicorn/subprocess log redirection
# and are unnecessary in a server context.
os.environ.setdefault("TQDM_DISABLE", "1")
os.environ.setdefault("DOCLING_PROGRESS_BAR", "False")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

from docling.document_converter import DocumentConverter


def process_pdf(pdf_path: str) -> dict:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    converter = DocumentConverter()
    result = converter.convert(pdf_path)
    document = result.document

    markdown_content = document.export_to_markdown()

    tables = []
    try:
        for table in document.tables:
            table_data = []
            for row in table.data:
                table_data.append([str(cell) for cell in row])
            tables.append(table_data)
    except Exception:
        pass

    metadata = {
        "filename": os.path.basename(pdf_path),
        "pages": len(document.pages) if hasattr(document, "pages") else 0,
    }

    return {
        "markdown": markdown_content,
        "tables": tables,
        "metadata": metadata,
    }
