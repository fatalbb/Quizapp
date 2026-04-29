namespace QuizApp.Application.Common.Interfaces;

public interface ISqlSandboxService
{
    /// <summary>
    /// Loads each sheet of an Excel file into a fresh in-memory SQLite database
    /// (each sheet becomes a table). Then executes the provided query and returns
    /// the results (or an error message). Each call uses a fresh database, so
    /// modifications don't persist between runs.
    /// </summary>
    Task<SqlSandboxResult> ExecuteQueryAsync(Stream excelStream, string query, CancellationToken cancellationToken = default);
}

public class SqlSandboxResult
{
    public bool Success { get; set; }
    public List<string> Columns { get; set; } = [];
    public List<List<string?>> Rows { get; set; } = [];
    public int RowsAffected { get; set; } // for DML statements
    public string? ErrorMessage { get; set; }
    public long ElapsedMs { get; set; }
}
