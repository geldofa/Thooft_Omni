/// <reference path="../pb_data/types.d.ts" />

/**
 * [Report Mailing Hook]
 * Automatically sends generated reports via email if 'email_enabled' is true.
 * Records the results in the 'report_files' record.
 */

onRecordAfterCreateSuccess((e) => {
  try {
    const reportFile = e.record;
    const reportId = reportFile.getString("maintenance_report");

    if (!reportId) return;

    // Fetch the associated report configuration
    const report = $app.findRecordById("maintenance_reports", reportId);

    // Skip if mailing is not enabled or recipients are empty
    const emailEnabled = report.getBool("email_enabled");
    const recipients = report.getString("email_recipients");

    if (!emailEnabled || !recipients) {
      $app.logger().debug(`[Mailing] Skipping report '${reportId}': enabled=${emailEnabled}, recipients=${!!recipients}`);
      return;
    }

    // Note: In current schema 'auto_generate' seems to be the main toggle for scheduled tasks.
    // If the user wants mailing specifically, we should check if they intend for it to always mail
    // when recipients are present. Given the prompt, let's assume if recipients exist, we try to mail.

    const fileName = reportFile.getString("file");
    const filePath = $app.dataDir() + "/storage/" + reportFile.collection().id + "/" + fileName;

    const settings = $app.settings();
    const senderAddress = settings.meta.senderAddress || "noreply@example.com";
    const senderName = settings.meta.senderName || "Omni Notificaties";

    const reportDate = new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const reportTime = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const currentYear = new Date().getFullYear().toString();
    const reportName = report.getString("name");

    let subject = `[Omni] Rapport Beschikbaar: ${reportName}`;
    let htmlBody = "";

    // Try to fetch from email_templates collection
    try {
      const template = $app.findFirstRecordByFilter("email_templates", "name = 'Rapport Notificatie'");
      subject = template.getString("subject")
        .replace(/{{report_name}}/g, reportName)
        .replace(/{{report_date}}/g, reportDate)
        .replace(/{{report_time}}/g, reportTime);

      htmlBody = template.getString("html_content")
        .replace(/{{report_name}}/g, reportName)
        .replace(/{{report_date}}/g, reportDate)
        .replace(/{{report_time}}/g, reportTime)
        .replace(/{{year}}/g, currentYear);

      $app.logger().debug(`[Mailing] Using database template for '${reportName}'`);
    } catch (err) {
      $app.logger().warn(`[Mailing] Template 'Rapport Notificatie' not found in DB, using hardcoded fallback.`);

      subject = `[Omni] Rapport Beschikbaar: ${reportName}`;
      htmlBody = `
            <!DOCTYPE html>
            <html lang="nl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
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
                                    <td style="color: #1e293b; font-size: 14px; font-weight: 600; padding-top: 0;">${reportName}</td>
                                  </tr>
                                  <tr>
                                    <td width="120" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Datum:</td>
                                    <td style="color: #1e293b; font-size: 14px;">${reportDate}</td>
                                  </tr>
                                  <tr>
                                    <td width="120" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 0;">Tijdstip:</td>
                                    <td style="color: #1e293b; font-size: 14px; padding-bottom: 0;">${reportTime}</td>
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
                              © ${currentYear} Omni · Thooft. Alle rechten voorbehouden.
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
            `;
    }


    const message = new MailerMessage({
      from: { address: senderAddress, name: senderName },
      to: recipients.split(',').map(email => ({ address: email.trim() })),
      subject: subject,
      html: htmlBody,
      attachments: {
        [fileName]: filePath
      }
    });

    try {
      $app.newMailClient().send(message);

      // Update the record with success status
      reportFile.set("email_status", "sent");
      reportFile.set("email_recipients", recipients);
      $app.save(reportFile);

      $app.logger().info(`[Mailing] Report '${fileName}' sent to ${recipients}`);
    } catch (mailErr) {
      $app.logger().error(`[Mailing] Failed to send report '${fileName}': ${mailErr}`);

      // Update the record with failure status
      reportFile.set("email_status", "failed");
      reportFile.set("email_recipients", recipients);
      reportFile.set("email_error", mailErr.toString());
      $app.save(reportFile);
    }

  } catch (err) {
    $app.logger().error("[Mailing Hook Global Error]", err);
  }

  e.next();
}, "report_files");
