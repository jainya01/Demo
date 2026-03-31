import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const EXPORT_TEMPLATE = {
  Sector: "Sector.xlsx",
  Passenger: "Passenger.xlsx",
  Airlines: "Airlines.xlsx",
  PNR: "PNR.xlsx",
};

export const exportExcel = async (data, type) => {
  try {
    if (
      type !== "Sector" &&
      type !== "Passenger" &&
      type !== "Airlines" &&
      type !== "PNR"
    )
      return;

    const fileName = EXPORT_TEMPLATE[type];
    const response = await fetch(`/files/${fileName}`);

    if (!response.ok) throw new Error("Template fetch failed");

    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const START_ROW = 2;

    data.forEach((item, index) => {
      const row = worksheet.getRow(START_ROW + index);

      row.getCell("A").value = index + 1;

      if (type === "Sector") {
        row.getCell("B").value = item.sector || "";
        row.getCell("C").value = item.pnr || "";
        row.getCell("D").value = item.pax_sold || 0;
        row.getCell("E").value = item.dot || "";
        row.getCell("F").value = item.airline || "";
        row.getCell("G").value = item.flightno || "";

        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      if (type === "Passenger") {
        row.getCell("B").value = item.pax || "";
        row.getCell("C").value = item.pnr || "";
        row.getCell("D").value = item.fare || 0;
        row.getCell("E").value = "AL HAMD";
        row.getCell("F").value = item.dot || "";
        row.getCell("G").value = item.airline || "";
        row.getCell("H").value = item.flightno || "";
        row.getCell("I").value = item.sector || "";

        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      if (type === "Airlines") {
        row.getCell("B").value = item.airline || "";
        row.getCell("C").value = item.flightno || "";

        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      if (type === "PNR") {
        row.getCell("B").value = item.pnr || "";
        row.getCell("C").value = item.dot || "";
        row.getCell("D").value = item.title || "";
        row.getCell("E").value = item.pax || "";
        row.getCell("F").value = item.lastname || "";

        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      row.commit();
    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      fileName,
    );
  } catch (err) {
    console.error(`${type} export failed:`, err);
    alert(`${type} Excel download failed`);
  }
};
