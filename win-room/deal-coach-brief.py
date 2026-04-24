#!/usr/bin/env python3
"""Generate Deal Coach stakeholder briefing PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus.flowables import Flowable
import os

# ── Colors ──────────────────────────────────────────────────
NAVY       = HexColor("#0A1628")
DARK_NAVY  = HexColor("#060E1A")
BLUE       = HexColor("#3B82F6")
BLUE_LIGHT = HexColor("#DBEAFE")
BLUE_PALE  = HexColor("#EFF6FF")
AMBER      = HexColor("#B8860B")
AMBER_LIGHT= HexColor("#FEF3C7")
RED_BG     = HexColor("#FEF2F2")
RED_TEXT   = HexColor("#991B1B")
GREEN_BG   = HexColor("#F0FDF4")
GREEN_TEXT = HexColor("#166534")
YELLOW_BG  = HexColor("#FFFBEB")
YELLOW_TEXT= HexColor("#92400E")
GRAY_50    = HexColor("#F9FAFB")
GRAY_100   = HexColor("#F3F4F6")
GRAY_200   = HexColor("#E5E7EB")
GRAY_300   = HexColor("#D1D5DB")
GRAY_500   = HexColor("#6B7280")
GRAY_600   = HexColor("#4B5563")
GRAY_700   = HexColor("#374151")
GRAY_800   = HexColor("#1F2937")
GRAY_900   = HexColor("#111827")
WHITE      = HexColor("#FFFFFF")

# ── Styles ──────────────────────────────────────────────────
s_title = ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=22,
                         leading=26, textColor=NAVY, spaceAfter=2)
s_subtitle = ParagraphStyle("Subtitle", fontName="Helvetica", fontSize=10,
                            leading=14, textColor=GRAY_500, spaceAfter=6)
s_section = ParagraphStyle("Section", fontName="Helvetica-Bold", fontSize=11,
                           leading=14, textColor=NAVY, spaceBefore=10, spaceAfter=4)
s_body = ParagraphStyle("Body", fontName="Helvetica", fontSize=8.5,
                        leading=12, textColor=GRAY_700, spaceAfter=3)
s_body_bold = ParagraphStyle("BodyBold", fontName="Helvetica-Bold", fontSize=8.5,
                             leading=12, textColor=GRAY_800, spaceAfter=3)
s_bullet = ParagraphStyle("Bullet", fontName="Helvetica", fontSize=8.5,
                          leading=12, textColor=GRAY_700, leftIndent=12,
                          bulletIndent=0, spaceAfter=2)
s_small = ParagraphStyle("Small", fontName="Helvetica", fontSize=7.5,
                         leading=10, textColor=GRAY_500)
s_small_bold = ParagraphStyle("SmallBold", fontName="Helvetica-Bold", fontSize=7.5,
                              leading=10, textColor=GRAY_600)
s_tag = ParagraphStyle("Tag", fontName="Helvetica-Bold", fontSize=7,
                       leading=9, textColor=BLUE)
s_card_title = ParagraphStyle("CardTitle", fontName="Helvetica-Bold", fontSize=8.5,
                              leading=11, textColor=NAVY, spaceAfter=2)
s_card_body = ParagraphStyle("CardBody", fontName="Helvetica", fontSize=7.5,
                             leading=10, textColor=GRAY_600, spaceAfter=1)
s_footer = ParagraphStyle("Footer", fontName="Helvetica", fontSize=7,
                          leading=9, textColor=GRAY_500, alignment=TA_CENTER)
s_header_right = ParagraphStyle("HeaderRight", fontName="Helvetica", fontSize=8,
                                leading=10, textColor=GRAY_500, alignment=TA_RIGHT)
s_feedback_head = ParagraphStyle("FBHead", fontName="Helvetica-Bold", fontSize=9,
                                 leading=12, textColor=NAVY, spaceAfter=3)
s_number = ParagraphStyle("Number", fontName="Helvetica-Bold", fontSize=18,
                          leading=20, textColor=BLUE, alignment=TA_CENTER)
s_number_label = ParagraphStyle("NumberLabel", fontName="Helvetica", fontSize=7,
                                leading=9, textColor=GRAY_500, alignment=TA_CENTER)


class RoundedRect(Flowable):
    """A rounded-corner colored box containing flowables."""
    def __init__(self, width, content, bg=GRAY_50, border=GRAY_200,
                 padding=8, radius=4):
        super().__init__()
        self.width = width
        self.content = content
        self.bg = bg
        self.border = border
        self.padding = padding
        self.radius = radius
        # pre-calc height
        w = width - 2 * padding
        self._content_heights = []
        total = 0
        for f in content:
            if hasattr(f, 'wrap'):
                _, h = f.wrap(w, 1000)
            else:
                h = 12
            self._content_heights.append(h)
            total += h
        self.height = total + 2 * padding

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(self.bg)
        c.setStrokeColor(self.border)
        c.setLineWidth(0.5)
        c.roundRect(0, 0, self.width, self.height,
                    self.radius, fill=1, stroke=1)
        c.restoreState()
        # draw content top-down
        y = self.height - self.padding
        w = self.width - 2 * self.padding
        for i, f in enumerate(self.content):
            h = self._content_heights[i]
            y -= h
            f.wrapOn(c, w, h)
            f.drawOn(c, self.padding, y)


class AccentBar(Flowable):
    """Thin colored bar."""
    def __init__(self, width, height=3, color=BLUE):
        super().__init__()
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, 1.5, fill=1, stroke=0)


def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.6*inch, rightMargin=0.6*inch,
        topMargin=0.5*inch, bottomMargin=0.5*inch
    )
    pw = letter[0] - 1.2*inch  # usable width
    story = []

    # ── Header ──────────────────────────────────────────────
    header_data = [[
        Paragraph("Deal Coach", s_title),
        Paragraph("ZNITH Sales Toolkit<br/>Stakeholder Briefing | April 2026", s_header_right)
    ]]
    header_table = Table(header_data, colWidths=[pw * 0.65, pw * 0.35])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Paragraph(
        "An AI-powered deal intelligence hub that guides AEs through the entire sales cycle "
        "with contextual coaching, real-time feedback, and strategic deal management.",
        s_subtitle
    ))
    story.append(AccentBar(pw, 3, BLUE))
    story.append(Spacer(1, 8))

    # ── Problem / Opportunity ───────────────────────────────
    story.append(Paragraph("THE PROBLEM", s_section))
    story.append(Paragraph(
        "Enterprise deals involve 5-25+ calls across multiple stakeholders, teams, and months. "
        "Reps struggle to maintain strategic continuity across a complex sales cycle "
        "while ensuring MEDDPICC qualification, champion development, and competitive positioning "
        "at every stage. Critical deal intelligence lives in scattered notes, CRM fields, and memory. "
        "Meanwhile, the team's #1 request is real-time, actionable coaching feedback.",
        s_body
    ))
    story.append(Spacer(1, 4))

    # ── Solution Overview ───────────────────────────────────
    story.append(Paragraph("THE SOLUTION", s_section))
    story.append(Paragraph(
        "Deal Coach is a persistent, AI-powered deal workspace that accumulates context over the "
        "life of a deal and delivers contextual coaching at every stage. Unlike one-shot tools, "
        "Deal Coach maintains a rolling understanding of each deal and gets smarter with every interaction.",
        s_body
    ))
    story.append(Spacer(1, 6))

    # ── Architecture: Hub Layout ────────────────────────────
    story.append(Paragraph("ARCHITECTURE: HUB + CONTEXT PANEL", s_section))

    arch_content = [
        Paragraph(
            '<font color="#3B82F6"><b>Nav Rail</b></font> (left) &mdash; Jump between any section at any time. Non-linear workflow.',
            s_card_body
        ),
        Paragraph(
            '<font color="#3B82F6"><b>Active Workspace</b></font> (center) &mdash; The section the rep is focused on. '
            'AI outputs adapt based on full deal context.',
            s_card_body
        ),
        Paragraph(
            '<font color="#3B82F6"><b>Context Panel</b></font> (right) &mdash; Always-visible deal snapshot: health score, '
            'MEDDPICC status, stakeholders, account intel. Updates in real time.',
            s_card_body
        ),
        Paragraph(
            '<font color="#3B82F6"><b>AI Chat</b></font> (widget) &mdash; Deal-aware strategist available from any section. '
            'Knows stakeholders by name, competitive threats, call history.',
            s_card_body
        ),
    ]
    story.append(RoundedRect(pw, arch_content, bg=BLUE_PALE, border=HexColor("#BFDBFE"),
                             padding=10, radius=6))
    story.append(Spacer(1, 6))

    # ── Core Modules Table ──────────────────────────────────
    story.append(Paragraph("CORE MODULES", s_section))

    mod_header = [
        Paragraph("<b>Section</b>", s_small_bold),
        Paragraph("<b>Purpose</b>", s_small_bold),
        Paragraph("<b>Key Capabilities</b>", s_small_bold),
    ]
    mod_rows = [
        [Paragraph("Deal Setup", s_small_bold),
         Paragraph("Account info, stage, products", s_small),
         Paragraph("Import from Sales Hub outputs; mid-deal catchup via bulk transcript upload", s_small)],
        [Paragraph("Stakeholders", s_small_bold),
         Paragraph("Org chart and relationship map", s_small),
         Paragraph("Roles, sentiment, access gaps; auto-populated from call transcripts", s_small)],
        [Paragraph("Call Hub", s_small_bold),
         Paragraph("Call prep, debrief, and feedback", s_small),
         Paragraph("Transcript-based performance feedback; Coach's Corner nudges; call type-adaptive prep", s_small)],
        [Paragraph("Strategy", s_small_bold),
         Paragraph("MEDDPICC and competitive analysis", s_small),
         Paragraph("Gap analysis, competitive plays, risk scoring; informed by Qualify IQ methodology", s_small)],
        [Paragraph("Mutual Plan", s_small_bold),
         Paragraph("Milestones, owners, timeline", s_small),
         Paragraph("Living timeline with risk flags; milestone tracking with owner accountability", s_small)],
        [Paragraph("Deal Review", s_small_bold),
         Paragraph("Health dashboard and temperature check", s_small),
         Paragraph("Red/yellow/green across all dimensions; forecast recommendation; proactive flags", s_small)],
        [Paragraph("Deal Brief", s_small_bold),
         Paragraph("Export for managers and partners", s_small),
         Paragraph("AI-synthesized PDF/Word one-pager; customizable sections; shareable summary", s_small)],
    ]

    mod_table = Table(
        [mod_header] + mod_rows,
        colWidths=[pw * 0.15, pw * 0.30, pw * 0.55],
        repeatRows=1
    )
    mod_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_50]),
        ("GRID", (0, 0), (-1, -1), 0.4, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(mod_table)
    story.append(Spacer(1, 6))

    # ── Key Differentiators (3 cards side by side) ──────────
    story.append(Paragraph("KEY DIFFERENTIATORS", s_section))

    card_w = (pw - 16) / 3

    def make_card(title, body, bg, border):
        content = [
            Paragraph(title, s_card_title),
            Paragraph(body, s_card_body),
        ]
        return RoundedRect(card_w, content, bg=bg, border=border, padding=8, radius=4)

    card1 = make_card(
        "Transcript-Based Feedback",
        "AI reviews actual call recordings, not self-reported summaries. "
        "Catches missed buying signals, premature pricing discussions, and untested champions. "
        "Reps get honest, specific coaching after every call.",
        GREEN_BG, HexColor("#BBF7D0")
    )
    card2 = make_card(
        "Rolling Deal Intelligence",
        "A compressed Deal State Summary is maintained by AI after every debrief, "
        "with full detail on the last 1-2 calls. Context stays sharp and relevant "
        "whether it's call #3 or call #23.",
        BLUE_PALE, HexColor("#BFDBFE")
    )
    card3 = make_card(
        "Proactive Coach's Corner",
        "Every call prep includes strategic nudges: untested champions, missing EB access, "
        "undefined metrics, stale mutual plans. Urgency escalates automatically "
        "based on deal stage and timeline.",
        AMBER_LIGHT, HexColor("#FDE68A")
    )

    card_data = [[card1, card2, card3]]
    card_table = Table(card_data, colWidths=[card_w + 4, card_w + 4, card_w + 4])
    card_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(card_table)
    story.append(Spacer(1, 6))

    # ── How It Works (numbered flow) ────────────────────────
    story.append(Paragraph("HOW IT WORKS", s_section))

    flow_steps = [
        ("Setup", "Rep creates a deal (or imports mid-cycle with bulk transcript upload). AI auto-fills stakeholders, MEDDPICC, and mutual plan from available data."),
        ("Prep", "Before each call, AI generates contextual prep informed by the entire deal history, identifies strategic gaps, and recommends specific talk tracks."),
        ("Debrief", "After each call, rep uploads transcript. AI extracts outcomes, provides performance feedback, proposes deal updates for rep approval, and refreshes the Deal State Summary."),
        ("Iterate", "With every call cycle, the AI's coaching gets sharper. The Context Panel and Deal Review surface risks before they become blockers."),
    ]

    for i, (label, desc) in enumerate(flow_steps, 1):
        step_data = [[
            Paragraph(f'<font color="#3B82F6"><b>{i}</b></font>', ParagraphStyle(
                "StepNum", fontName="Helvetica-Bold", fontSize=14, leading=16,
                textColor=BLUE, alignment=TA_CENTER
            )),
            Paragraph(f'<b>{label}:</b>  {desc}', s_body),
        ]]
        step_table = Table(step_data, colWidths=[30, pw - 34])
        step_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        story.append(step_table)

    story.append(Spacer(1, 6))

    # ── Technical Approach ──────────────────────────────────
    story.append(Paragraph("TECHNICAL APPROACH", s_section))

    tech_left = [
        Paragraph("<b>Prototype (Now)</b>", s_small_bold),
        Paragraph("React 18 single-page app in existing ZNITH toolkit", s_small),
        Paragraph("localStorage persistence (per-deal state)", s_small),
        Paragraph("Shared /api/claude proxy (Anthropic API)", s_small),
        Paragraph("ZNITH Design System (dark theme, blue accent)", s_small),
    ]
    tech_right = [
        Paragraph("<b>Production (With Backend)</b>", s_small_bold),
        Paragraph("Database-backed deal persistence", s_small),
        Paragraph("Multi-user collaboration and manager views", s_small),
        Paragraph("CRM integration (Salesforce deal sync)", s_small),
        Paragraph("Cross-deal pipeline analytics", s_small),
    ]

    tech_col_w = (pw - 12) / 2
    tech_card_left = RoundedRect(tech_col_w, tech_left, bg=GRAY_50, border=GRAY_200, padding=8)
    tech_card_right = RoundedRect(tech_col_w, tech_right, bg=GRAY_50, border=GRAY_200, padding=8)

    tech_table = Table([[tech_card_left, tech_card_right]],
                       colWidths=[tech_col_w + 6, tech_col_w + 6])
    tech_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 8))

    # ── Feedback Request ────────────────────────────────────
    fb_content = [
        Paragraph("FEEDBACK REQUESTED", ParagraphStyle(
            "FBTitle", fontName="Helvetica-Bold", fontSize=10,
            leading=13, textColor=NAVY, spaceAfter=4
        )),
        Paragraph(
            "We're finalizing the design before building the prototype. Your input on these questions will shape the product:",
            ParagraphStyle("FBIntro", fontName="Helvetica", fontSize=8, leading=11,
                          textColor=GRAY_700, spaceAfter=6)
        ),
        Paragraph(
            "<b>1.</b>  Does the module structure (Deal Setup, Stakeholders, Call Hub, Strategy, Mutual Plan, "
            "Deal Review, Deal Brief) cover the full deal lifecycle? What's missing?",
            s_card_body
        ),
        Spacer(1, 2),
        Paragraph(
            "<b>2.</b>  Is transcript-based performance feedback (good + constructive) after every call "
            "the right approach? How candid should the AI be?",
            s_card_body
        ),
        Spacer(1, 2),
        Paragraph(
            "<b>3.</b>  The Coach's Corner proactively nudges reps on MEDDPICC gaps, champion testing, "
            "and missing stakeholders during call prep. Will reps find this helpful or noisy?",
            s_card_body
        ),
        Spacer(1, 2),
        Paragraph(
            "<b>4.</b>  For the Deal Brief export, what information do managers / SEs / partners most "
            "need to see? What's the ideal format?",
            s_card_body
        ),
        Spacer(1, 2),
        Paragraph(
            "<b>5.</b>  What integrations or data sources would make this significantly more valuable? "
            "(e.g., Salesforce sync, Gong transcripts, Slack notifications)",
            s_card_body
        ),
    ]
    story.append(RoundedRect(pw, fb_content, bg=BLUE_PALE, border=BLUE, padding=12, radius=6))
    story.append(Spacer(1, 10))

    # ── Footer ──────────────────────────────────────────────
    story.append(HRFlowable(width=pw, thickness=0.5, color=GRAY_200))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "ZNITH Sales Toolkit  |  Deal Coach Module  |  Draft for Internal Review  |  April 2026",
        s_footer
    ))

    doc.build(story)
    return output_path


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "Deal_Coach_Briefing.pdf")
    build_pdf(out_path)
    print(f"PDF generated: {out_path}")
