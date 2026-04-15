using ClosedXML.Excel;
using QuizApp.Application.Common.Interfaces;

namespace QuizApp.Infrastructure.Services;

public class ExcelParserService : IExcelParserService
{
    public List<TableSchemaDto> ParseExcelSchema(Stream fileStream)
    {
        var schemas = new List<TableSchemaDto>();
        using var workbook = new XLWorkbook(fileStream);

        foreach (var worksheet in workbook.Worksheets)
        {
            var schema = new TableSchemaDto { TableName = worksheet.Name };
            var lastColumn = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;
            var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
            if (lastColumn == 0 || lastRow == 0) continue;

            // Read headers (row 1)
            for (int col = 1; col <= lastColumn; col++)
            {
                var headerCell = worksheet.Cell(1, col);
                var columnName = headerCell.GetString().Trim();
                if (string.IsNullOrEmpty(columnName)) continue;

                // Infer type from data in rows 2+
                var dataType = "TEXT";
                for (int row = 2; row <= Math.Min(lastRow, 5); row++)
                {
                    var cell = worksheet.Cell(row, col);
                    if (cell.IsEmpty()) continue;
                    if (cell.DataType == XLDataType.Number) { dataType = "NUMERIC"; break; }
                    if (cell.DataType == XLDataType.DateTime) { dataType = "DATE"; break; }
                    if (cell.DataType == XLDataType.Boolean) { dataType = "BOOLEAN"; break; }
                    break;
                }

                schema.Columns.Add(new ColumnSchemaDto { Name = columnName, DataType = dataType });
            }

            // Read up to 3 sample rows (rows 2-4)
            for (int row = 2; row <= Math.Min(lastRow, 4); row++)
            {
                var sampleRow = new List<string>();
                for (int col = 1; col <= lastColumn; col++)
                {
                    sampleRow.Add(worksheet.Cell(row, col).GetString());
                }
                schema.SampleRows.Add(sampleRow);
            }

            schemas.Add(schema);
        }
        return schemas;
    }
}
