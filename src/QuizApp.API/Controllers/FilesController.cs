using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Application.Common.Interfaces;

namespace QuizApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class FilesController : ControllerBase
{
    private readonly string _basePath;
    private readonly IExcelParserService _excelParserService;

    public FilesController(IConfiguration configuration, IExcelParserService excelParserService)
    {
        var configPath = configuration["FileStorage:BasePath"] ?? "wwwroot/uploads";
        _basePath = Path.IsPathRooted(configPath)
            ? configPath
            : Path.Combine(Directory.GetCurrentDirectory(), configPath);
        _excelParserService = excelParserService;
    }

    [HttpGet("{**filePath}")]
    public IActionResult GetFile(string filePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, filePath));

        if (!fullPath.StartsWith(Path.GetFullPath(_basePath)))
            return BadRequest();

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = $"File not found: {filePath}" });

        var contentType = GetContentType(fullPath);
        return PhysicalFile(fullPath, contentType);
    }

    [HttpGet("parse-excel/{**filePath}")]
    public IActionResult ParseExcel(string filePath, [FromQuery] int maxRows = 20)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, filePath));

        if (!fullPath.StartsWith(Path.GetFullPath(_basePath)))
            return BadRequest();

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = $"File not found: {filePath}" });

        // Cap maxRows for safety (still allow caller to override up to 1000)
        maxRows = Math.Clamp(maxRows, 1, 1000);

        using var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
        using var workbook = new ClosedXML.Excel.XLWorkbook(stream);

        var tables = workbook.Worksheets.Select(ws =>
        {
            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            if (lastCol == 0 || lastRow == 0) return null;

            var columns = new List<string>();
            for (int c = 1; c <= lastCol; c++)
                columns.Add(ws.Cell(1, c).GetString().Trim());

            // Limit data rows to maxRows (excluding the header row)
            var dataRowCount = lastRow - 1;
            var rowLimit = Math.Min(dataRowCount, maxRows);
            var rows = new List<List<string>>(rowLimit);
            for (int r = 2; r <= rowLimit + 1; r++)
            {
                var row = new List<string>();
                for (int c = 1; c <= lastCol; c++)
                    row.Add(ws.Cell(r, c).GetString());
                rows.Add(row);
            }

            return new
            {
                tableName = ws.Name,
                columns,
                rows,
                totalRows = dataRowCount,
                truncated = dataRowCount > maxRows
            };
        }).Where(t => t != null).ToList();

        return Ok(tables);
    }

    private static string GetContentType(string path) =>
        Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls" => "application/vnd.ms-excel",
            _ => "application/octet-stream"
        };
}
