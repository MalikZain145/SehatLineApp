import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export async function generateLaboratoryReport(patient) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 35px;
            color: #1F2937;
          }

          .header {
            text-align: center;
            border-bottom: 3px solid #0BAA9D;
            padding-bottom: 18px;
            margin-bottom: 25px;
          }

          .hospital {
            color: #0BAA9D;
            font-size: 25px;
            font-weight: bold;
          }

          .laboratory {
            color: #2E7D5C;
            font-size: 18px;
            margin-top: 6px;
          }

          .title {
            text-align: center;
            font-size: 21px;
            font-weight: bold;
            margin-bottom: 25px;
          }

          .section {
            background: #C8F3E7;
            padding: 10px;
            font-size: 15px;
            font-weight: bold;
            color: #2E7D5C;
            margin-top: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }

          td {
            border: 1px solid #E5E7EB;
            padding: 11px;
            font-size: 13px;
          }

          .label {
            font-weight: bold;
            width: 35%;
          }

          .result {
            margin-top: 15px;
            padding: 15px;
            border: 1px solid #E5E7EB;
          }

          .completed {
            color: #2E7D5C;
            font-weight: bold;
          }

          .footer {
            margin-top: 45px;
            padding-top: 15px;
            border-top: 1px solid #E5E7EB;
            font-size: 11px;
            color: #6B7280;
            text-align: center;
          }
        </style>
      </head>

      <body>

        <div class="header">
          <div class="hospital">
            HOSPITAL MANAGEMENT SYSTEM
          </div>

          <div class="laboratory">
            LABORATORY DEPARTMENT
          </div>
        </div>

        <div class="title">
          LABORATORY TEST REPORT
        </div>

        <div class="section">
          Patient Information
        </div>

        <table>
          <tr>
            <td class="label">Patient Name</td>
            <td>${patient.patientName}</td>
          </tr>

          <tr>
            <td class="label">Card Number</td>
            <td>${patient.cardNo}</td>
          </tr>

          <tr>
            <td class="label">Doctor</td>
            <td>${patient.doctorName}</td>
          </tr>

          <tr>
            <td class="label">Test</td>
            <td>${patient.testName}</td>
          </tr>

          <tr>
            <td class="label">Request Time</td>
            <td>${patient.time}</td>
          </tr>

          <tr>
            <td class="label">Completed</td>
            <td>${patient.completedAt || "Completed"}</td>
          </tr>
        </table>

      <div class="section">
  Test Result
</div>

<div class="result">
  <strong>${patient.testName}</strong>

  <p>
    <strong>Result:</strong>
  </p>

  <p>
    ${patient.result || "No result entered."}
  </p>

  <p class="completed">
    Status: COMPLETED
  </p>
</div>

<div class="section">
  Laboratory Remarks
</div>

<div class="result">
  <p>
    ${patient.remarks || "No additional remarks."}
  </p>
</div>

        <div class="section">
          Laboratory Remarks
        </div>

        <div class="result">
          Report successfully processed and completed
          by the laboratory department.
        </div>

        <div class="footer">
          This is a computer-generated laboratory report.
          <br />
          Hospital Management System
        </div>

      </body>
    </html>
  `;

  const result = await Print.printToFileAsync({
    html,
  });

  return result.uri;
}

export async function shareLaboratoryReport(uri) {
  const available = await Sharing.isAvailableAsync();

  if (!available) {
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Laboratory Report",
    UTI: "com.adobe.pdf",
  });
}