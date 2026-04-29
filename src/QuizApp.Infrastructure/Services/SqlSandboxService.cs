using System.Diagnostics;
using ClosedXML.Excel;
using Microsoft.Data.Sqlite;
using QuizApp.Application.Common.Interfaces;

namespace QuizApp.Infrastructure.Services;

public class SqlSandboxService : ISqlSandboxService
{
    private const int QueryTimeoutSeconds = 5;
    private const int MaxResultRows = 500;

    public async Task<SqlSandboxResult> ExecuteQueryAsync(Stream excelStream, string query, CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var result = new SqlSandboxResult();

        try
        {
            // Fresh in-memory SQLite database
            using var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync(cancellationToken);

            // Load Excel into SQLite tables
            LoadExcelIntoSqlite(connection, excelStream);

            // Execute the user's query with timeout
            using var cmd = connection.CreateCommand();
            cmd.CommandText = query;
            cmd.CommandTimeout = QueryTimeoutSeconds;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(QueryTimeoutSeconds + 2));

            // Determine if it's a query (returns rows) or a non-query (DML/DDL)
            var isQuery = LooksLikeQuery(query);

            if (isQuery)
            {
                using var reader = await cmd.ExecuteReaderAsync(cts.Token);

                for (int i = 0; i < reader.FieldCount; i++)
                    result.Columns.Add(reader.GetName(i));

                int count = 0;
                while (await reader.ReadAsync(cts.Token) && count < MaxResultRows)
                {
                    var row = new List<string?>();
                    for (int i = 0; i < reader.FieldCount; i++)
                        row.Add(reader.IsDBNull(i) ? null : reader.GetValue(i)?.ToString());
                    result.Rows.Add(row);
                    count++;
                }
            }
            else
            {
                result.RowsAffected = await cmd.ExecuteNonQueryAsync(cts.Token);
            }

            result.Success = true;
        }
        catch (SqliteException ex)
        {
            result.Success = false;
            result.ErrorMessage = $"SQL error: {ex.Message}";
        }
        catch (OperationCanceledException)
        {
            result.Success = false;
            result.ErrorMessage = $"Query timed out (>{QueryTimeoutSeconds}s).";
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessage = $"Error: {ex.Message}";
        }
        finally
        {
            sw.Stop();
            result.ElapsedMs = sw.ElapsedMilliseconds;
        }

        return result;
    }

    private static bool LooksLikeQuery(string sql)
    {
        var trimmed = sql.TrimStart();
        // Strip leading comments
        while (trimmed.StartsWith("--") || trimmed.StartsWith("/*"))
        {
            if (trimmed.StartsWith("--"))
            {
                var idx = trimmed.IndexOf('\n');
                trimmed = idx < 0 ? "" : trimmed[(idx + 1)..].TrimStart();
            }
            else
            {
                var idx = trimmed.IndexOf("*/", StringComparison.Ordinal);
                trimmed = idx < 0 ? "" : trimmed[(idx + 2)..].TrimStart();
            }
        }
        var firstWord = trimmed.Split(new[] { ' ', '\t', '\n', '\r', '(' }, 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
        return firstWord.Equals("SELECT", StringComparison.OrdinalIgnoreCase)
            || firstWord.Equals("WITH", StringComparison.OrdinalIgnoreCase)
            || firstWord.Equals("EXPLAIN", StringComparison.OrdinalIgnoreCase)
            || firstWord.Equals("PRAGMA", StringComparison.OrdinalIgnoreCase);
    }

    private static void LoadExcelIntoSqlite(SqliteConnection connection, Stream excelStream)
    {
        using var workbook = new XLWorkbook(excelStream);

        foreach (var ws in workbook.Worksheets)
        {
            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            if (lastCol == 0 || lastRow == 0) continue;

            var tableName = SanitizeIdentifier(ws.Name);
            var columns = new List<(string Name, string Type)>();

            for (int c = 1; c <= lastCol; c++)
            {
                var rawName = ws.Cell(1, c).GetString().Trim();
                if (string.IsNullOrEmpty(rawName)) rawName = $"col{c}";
                var colName = SanitizeIdentifier(rawName);

                // Infer type from up to 5 sample values
                var inferredType = "TEXT";
                for (int r = 2; r <= Math.Min(lastRow, 6); r++)
                {
                    var cell = ws.Cell(r, c);
                    if (cell.IsEmpty()) continue;
                    if (cell.DataType == XLDataType.Number) { inferredType = "REAL"; break; }
                    if (cell.DataType == XLDataType.DateTime) { inferredType = "TEXT"; break; }
                    if (cell.DataType == XLDataType.Boolean) { inferredType = "INTEGER"; break; }
                    break;
                }
                columns.Add((colName, inferredType));
            }

            // CREATE TABLE
            var colDefs = string.Join(", ", columns.Select(c => $"\"{c.Name}\" {c.Type}"));
            using (var createCmd = connection.CreateCommand())
            {
                createCmd.CommandText = $"CREATE TABLE \"{tableName}\" ({colDefs})";
                createCmd.ExecuteNonQuery();
            }

            // INSERT data rows in a transaction for speed
            using var tx = connection.BeginTransaction();
            using var insertCmd = connection.CreateCommand();
            insertCmd.Transaction = tx;
            var paramNames = columns.Select((_, i) => $"@p{i}").ToList();
            insertCmd.CommandText = $"INSERT INTO \"{tableName}\" VALUES ({string.Join(", ", paramNames)})";
            foreach (var p in paramNames)
                insertCmd.Parameters.Add(new SqliteParameter(p, DBNull.Value));
            insertCmd.Prepare();

            for (int r = 2; r <= lastRow; r++)
            {
                for (int c = 1; c <= lastCol; c++)
                {
                    var cell = ws.Cell(r, c);
                    object value = cell.IsEmpty()
                        ? DBNull.Value
                        : cell.DataType switch
                        {
                            XLDataType.Number => cell.GetDouble(),
                            XLDataType.Boolean => cell.GetBoolean() ? 1 : 0,
                            XLDataType.DateTime => cell.GetDateTime().ToString("yyyy-MM-dd HH:mm:ss"),
                            _ => cell.GetString()
                        };
                    insertCmd.Parameters[c - 1].Value = value;
                }
                insertCmd.ExecuteNonQuery();
            }
            tx.Commit();
        }
    }

    private static string SanitizeIdentifier(string raw)
    {
        // Replace anything that's not letter/digit/underscore with underscore
        var chars = raw.Select(ch => char.IsLetterOrDigit(ch) || ch == '_' ? ch : '_').ToArray();
        var s = new string(chars);
        if (s.Length > 0 && char.IsDigit(s[0])) s = "_" + s;
        return string.IsNullOrEmpty(s) ? "_unnamed" : s;
    }
}
