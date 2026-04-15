namespace QuizApp.Application.Common.Interfaces;

public interface IExcelParserService
{
    List<TableSchemaDto> ParseExcelSchema(Stream fileStream);
}

public class TableSchemaDto
{
    public string TableName { get; set; } = string.Empty;
    public List<ColumnSchemaDto> Columns { get; set; } = [];
    public List<List<string>> SampleRows { get; set; } = [];
}

public class ColumnSchemaDto
{
    public string Name { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
}
