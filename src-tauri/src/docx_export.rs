use docx_rs::*;
use scraper::{Html, Node, ElementRef};

/// Generate a DOCX file from HTML content. Returns raw bytes.
#[tauri::command]
pub fn generate_docx(html: String) -> Result<Vec<u8>, String> {
    let fragment = Html::parse_fragment(&html);
    let root = fragment.root_element();

    let mut paragraphs: Vec<Paragraph> = Vec::new();

    for child in root.children() {
        if let Some(el) = ElementRef::wrap(child) {
            let mut ps = parse_element(&el);
            paragraphs.append(&mut ps);
        }
    }

    // Build document with A4 page
    let mut doc = Docx::new();

    // Add numbering for ordered lists
    doc = doc.add_abstract_numbering(
        AbstractNumbering::new(1)
            .add_level(
                Level::new(
                    0,
                    Start::new(1),
                    NumberFormat::new("decimal"),
                    LevelText::new("%1."),
                    LevelJc::new("left"),
                ),
            ),
    );
    doc = doc.add_numbering(Numbering::new(1, 1));

    for p in paragraphs {
        doc = doc.add_paragraph(p);
    }

    // A4: 210mm x 297mm, margins 25.4mm (1 inch)
    let mm_to_twips = |mm: f64| (mm * 56.7) as u32;
    doc = doc.page_size(
        mm_to_twips(210.0) as u32,
        mm_to_twips(297.0) as u32,
    );
    doc = doc.page_margin(
        PageMargin::new()
            .top(mm_to_twips(25.4) as i32)
            .bottom(mm_to_twips(25.4) as i32)
            .left(mm_to_twips(25.4) as i32)
            .right(mm_to_twips(25.4) as i32),
    );

    let mut buf = Vec::new();
    doc.build()
        .pack(&mut std::io::Cursor::new(&mut buf))
        .map_err(|e| format!("DOCX pack error: {}", e))?;

    Ok(buf)
}

/// Parse an HTML element into DOCX paragraphs.
fn parse_element(el: &ElementRef) -> Vec<Paragraph> {
    let tag = el.value().name();

    match tag {
        "h1" => vec![heading(el, "Heading1")],
        "h2" => vec![heading(el, "Heading2")],
        "h3" => vec![heading(el, "Heading3")],
        "h4" => vec![heading(el, "Heading4")],
        "h5" => vec![heading(el, "Heading5")],
        "h6" => vec![heading(el, "Heading6")],

        "p" => {
            let runs = parse_inline(el);
            let mut p = Paragraph::new();
            for r in runs {
                p = p.add_run(r);
            }
            vec![p]
        }

        "ul" => parse_list(el, false),
        "ol" => parse_list(el, true),

        "blockquote" => {
            let text = el.text().collect::<String>();
            let run = Run::new().add_text(text).italic();
            let p = Paragraph::new()
                .add_run(run)
                .indent(Some(720), None, None, None);
            vec![p]
        }

        "pre" => {
            let text = el.text().collect::<String>();
            text.lines()
                .map(|line| {
                    let run = Run::new()
                        .add_text(line)
                        .fonts(RunFonts::new().ascii("Courier New"))
                        .size(20);
                    Paragraph::new().add_run(run)
                })
                .collect()
        }

        // Container elements: recurse
        "div" | "section" | "article" | "main" | "header" | "footer" | "aside" | "figure"
        | "details" | "summary" | "nav" => {
            let mut out = Vec::new();
            for child in el.children() {
                if let Some(child_el) = ElementRef::wrap(child) {
                    out.append(&mut parse_element(&child_el));
                }
            }
            out
        }

        // Skip style/script
        "style" | "script" | "link" => vec![],

        // Fallback: extract text
        _ => {
            let text = el.text().collect::<String>();
            if text.trim().is_empty() {
                vec![]
            } else {
                vec![Paragraph::new().add_run(Run::new().add_text(text))]
            }
        }
    }
}

/// Create a heading paragraph.
fn heading(el: &ElementRef, style: &str) -> Paragraph {
    let text = el.text().collect::<String>();
    Paragraph::new()
        .add_run(Run::new().add_text(text).bold())
        .style(style)
}

/// Parse a list (ul/ol) into paragraphs.
fn parse_list(el: &ElementRef, ordered: bool) -> Vec<Paragraph> {
    let mut items = Vec::new();
    let li_sel = scraper::Selector::parse("li").unwrap();

    for li in el.select(&li_sel) {
        let runs = parse_inline(&li);
        if ordered {
            let mut p = Paragraph::new();
            for r in runs {
                p = p.add_run(r);
            }
            p = p.numbering(NumberingId::new(1), IndentLevel::new(0));
            items.push(p);
        } else {
            let mut p = Paragraph::new()
                .add_run(Run::new().add_text("• "))
                .indent(Some(360), Some(SpecialIndentType::Hanging(360)), None, None);
            for r in runs {
                p = p.add_run(r);
            }
            items.push(p);
        }
    }
    items
}

/// Parse inline content (bold, italic, code, links, text) into Runs.
fn parse_inline(el: &ElementRef) -> Vec<Run> {
    let mut runs = Vec::new();

    for child in el.children() {
        match child.value() {
            Node::Text(text) => {
                let t = text.text.to_string();
                if !t.is_empty() {
                    runs.push(Run::new().add_text(t));
                }
            }
            Node::Element(_) => {
                if let Some(child_el) = ElementRef::wrap(child) {
                    let tag = child_el.value().name();
                    let inner_text = child_el.text().collect::<String>();

                    match tag {
                        "strong" | "b" => {
                            runs.push(Run::new().add_text(inner_text).bold());
                        }
                        "em" | "i" => {
                            runs.push(Run::new().add_text(inner_text).italic());
                        }
                        "code" => {
                            runs.push(
                                Run::new()
                                    .add_text(inner_text)
                                    .fonts(RunFonts::new().ascii("Courier New")),
                            );
                        }
                        "a" => {
                            runs.push(
                                Run::new()
                                    .add_text(inner_text)
                                    .underline("single"),
                            );
                        }
                        "br" => {
                            runs.push(Run::new().add_break(BreakType::TextWrapping));
                        }
                        _ => {
                            // Recurse for nested inline
                            runs.append(&mut parse_inline(&child_el));
                        }
                    }
                }
            }
            _ => {}
        }
    }

    runs
}
