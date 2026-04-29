using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFeedbackAndReevaluation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowFeedback",
                table: "Quizzes",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AllowReevaluation",
                table: "Quizzes",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxReevaluationsPerStudent",
                table: "Quizzes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FeedbackExplanation",
                table: "AttemptAnswers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "ReevaluationCount",
                table: "AttemptAnswers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowFeedback",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "AllowReevaluation",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "MaxReevaluationsPerStudent",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "FeedbackExplanation",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "ReevaluationCount",
                table: "AttemptAnswers");
        }
    }
}
