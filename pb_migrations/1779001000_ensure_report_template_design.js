/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Ensuring Report Notification Template has Unlayer design");

    const COLLECTION_NAME = "email_templates";
    const TEMPLATE_NAME = "Rapport Notificatie";

    let record;
    try {
        record = app.findFirstRecordByFilter(COLLECTION_NAME, `name = '${TEMPLATE_NAME}'`);
        console.log(`   - Found existing template '${TEMPLATE_NAME}'. Updating design...`);
    } catch (_) {
        const col = app.findCollectionByNameOrId(COLLECTION_NAME);
        record = new Record(col);
        record.set("name", TEMPLATE_NAME);
        console.log(`   + Template '${TEMPLATE_NAME}' not found. Creating new record...`);
    }

    const htmlBody = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">
                Omni <span style="font-weight: 300; opacity: 0.9;">| Thooft</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Nieuw Rapport Beschikbaar</h2>
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                Er is zojuist een nieuw onderhoudsrapport voor u gegenereerd. U vindt het volledige PDF-document als bijlage bij dit bericht.
              </p>
              
              <!-- Report Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="8">
                      <tr>
                        <td width="120" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding-top: 0;">Sjabloon:</td>
                        <td style="color: #1e293b; font-size: 14px; font-weight: 600; padding-top: 0;">{{report_name}}</td>
                      </tr>
                      <tr>
                        <td width="120" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Datum:</td>
                        <td style="color: #1e293b; font-size: 14px;">{{report_date}}</td>
                      </tr>
                      <tr>
                        <td width="120" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 0;">Tijdstip:</td>
                        <td style="color: #1e293b; font-size: 14px; padding-bottom: 0;">{{report_time}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #94a3b8; font-size: 13px; font-style: italic;">
                Tip: Al uw rapporten zijn ook direct in te zien via het online dashboard onder de sectie "Archief".
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                  © {{year}} Omni · Thooft. Alle rechten voorbehouden.
                </p>
                <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px;">
                  Dit is een automatische melding. Gelieve niet rechtstreeks te antwoorden op dit bericht.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const design = {
        body: {
            rows: [
                {
                    cells: [1],
                    columns: [
                        {
                            contents: [
                                {
                                    type: "html",
                                    values: {
                                        html: htmlBody,
                                        containerPadding: "0px",
                                        anchor: "",
                                        displayCondition: null,
                                        _meta: {
                                            htmlID: "tpl_html_01",
                                            htmlClassNames: ""
                                        },
                                        selectable: true,
                                        draggable: true,
                                        duplicatable: true,
                                        deletable: true,
                                        hideable: true
                                    }
                                }
                            ],
                            values: {
                                backgroundColor: "#ffffff",
                                padding: "0px",
                                border: {},
                                borderRadius: "0px",
                                _meta: {
                                    htmlID: "col_01",
                                    htmlClassNames: ""
                                }
                            }
                        }
                    ],
                    values: {
                        displayCondition: null,
                        columns: false,
                        backgroundColor: "#f8fafc",
                        backgroundImage: {
                            url: "",
                            fullWidth: true,
                            repeat: "no-repeat",
                            size: "custom",
                            position: "center",
                            customPosition: ["50%", "50%"]
                        },
                        padding: "0px",
                        anchor: "",
                        hideable: true,
                        draggable: true,
                        duplicatable: true,
                        deletable: true,
                        selectable: true,
                        _meta: {
                            htmlID: "row_01",
                            htmlClassNames: ""
                        }
                    }
                }
            ],
            values: {
                backgroundColor: "#f8fafc",
                contentWidth: "600px",
                contentAlign: "center",
                fontFamily: {
                    label: "Arial",
                    value: "arial,helvetica,sans-serif"
                },
                preheaderText: "",
                linkStyle: {
                    body: true,
                    linkColor: "#2563eb",
                    linkHoverColor: "#1e40af",
                    linkUnderline: true,
                    linkHoverUnderline: true
                },
                _meta: {
                    htmlID: "body_01",
                    htmlClassNames: ""
                }
            }
        },
        schemaVersion: 18
    };

    record.set("subject", "[Omni] Rapport Beschikbaar: {{report_name}}");
    record.set("html_content", htmlBody);
    record.set("design", design);

    app.save(record);
    console.log(`   ✅ Template '${TEMPLATE_NAME}' ensured with Unlayer design.`);

}, (app) => {
    // No rollback needed for data update
});
