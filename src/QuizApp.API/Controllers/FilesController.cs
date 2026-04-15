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
    public IActionResult ParseExcel(string filePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, filePath));

        if (!fullPath.StartsWith(Path.GetFullPath(_basePath)))
            return BadRequest();

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = $"File not found: {filePath}" });

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

            var rows = new List<List<string>>();
            for (int r = 2; r <= lastRow; r++)
            {
                var row = new List<string>();
                for (int c = 1; c <= lastCol; c++)
                    row.Add(ws.Cell(r, c).GetString());
                rows.Add(row);
            }

            return new { tableName = ws.Name, columns, rows };
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
