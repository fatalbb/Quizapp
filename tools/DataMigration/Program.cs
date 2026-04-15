using Microsoft.Data.Sqlite;
using MySql.Data.MySqlClient;

var sqliteConn = "Data Source=" + Path.GetFullPath("../../src/QuizApp.API/QuizApp.db");
var mysqlConn = "Server=localhost;Port=3306;Database=QuizAppDb;User=root;Password=12345;AllowLoadLocalInfile=true;";

Console.WriteLine($"SQLite: {sqliteConn}");

// Table order matters for foreign keys. Parents first, then children.
var tableOrder = new[]
{
    "AspNetRoles",
    "AspNetUsers",
    "AspNetRoleClaims",
    "AspNetUserClaims",
    "AspNetUserLogins",
    "AspNetUserRoles",
    "AspNetUserTokens",
    "Categories",
    "Questions",
    "Answers",
    "QuestionMedia",
    "Quizzes",
    "QuizCategories",
    "QuizAttempts",
    "AttemptAnswers",
    "RefreshTokens"
};

using var sqlite = new SqliteConnection(sqliteConn);
sqlite.Open();

using var mysql = new MySqlConnection(mysqlConn);
mysql.Open();

// Disable FK checks during import
using (var cmd = mysql.CreateCommand())
{
    cmd.CommandText = "SET FOREIGN_KEY_CHECKS = 0;";
    cmd.ExecuteNonQuery();
}

// Delete existing data from child to parent first
foreach (var table in tableOrder.Reverse())
{
    try
    {
        using var truncate = mysql.CreateCommand();
        truncate.CommandText = $"DELETE FROM `{table}`";
        truncate.ExecuteNonQuery();
    }
    catch { /* table may not exist in MySQL */ }
}

foreach (var table in tableOrder)
{
    Console.Write($"Migrating {table}... ");

    // Check if table exists in SQLite
    using (var check = sqlite.CreateCommand())
    {
        check.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name=@name";
        check.Parameters.AddWithValue("@name", table);
        var exists = check.ExecuteScalar();
        if (exists == null)
        {
            Console.WriteLine("(skipped - not in SQLite)");
            continue;
        }
    }

    // Get rows from SQLite
    using var readCmd = sqlite.CreateCommand();
    readCmd.CommandText = $"SELECT * FROM `{table}`";

    using var reader = readCmd.ExecuteReader();
    if (!reader.HasRows)
    {
        Console.WriteLine("(empty)");
        continue;
    }

    var columns = new List<string>();
    for (int i = 0; i < reader.FieldCount; i++)
        columns.Add(reader.GetName(i));

    int count = 0;
    var colList = string.Join(", ", columns.Select(c => $"`{c}`"));
    var paramList = string.Join(", ", columns.Select(c => $"@p{columns.IndexOf(c)}"));

    while (reader.Read())
    {
        using var insert = mysql.CreateCommand();
        insert.CommandText = $"INSERT INTO `{table}` ({colList}) VALUES ({paramList})";

        for (int i = 0; i < reader.FieldCount; i++)
        {
            object value = reader.IsDBNull(i) ? DBNull.Value : reader.GetValue(i);

            // Convert SQLite date strings to DateTime for date columns
            if (value is string s && (columns[i].EndsWith("At") || columns[i].EndsWith("Date") || columns[i] == "ExpiresAt" || columns[i] == "LockoutEnd"))
            {
                if (DateTime.TryParse(s, out var dt))
                    value = dt;
            }

            insert.Parameters.AddWithValue($"@p{i}", value);
        }

        try
        {
            insert.ExecuteNonQuery();
            count++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n  Error on row: {ex.Message}");
            break;
        }
    }

    Console.WriteLine($"{count} rows");
}

// Re-enable FK checks
using (var cmd = mysql.CreateCommand())
{
    cmd.CommandText = "SET FOREIGN_KEY_CHECKS = 1;";
    cmd.ExecuteNonQuery();
}

Console.WriteLine("Migration complete!");
