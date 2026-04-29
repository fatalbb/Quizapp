using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTypeDistributionToQuizCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InputPercentage",
                table: "QuizCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MultipleChoicePercentage",
                table: "QuizCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SingleChoicePercentage",
                table: "QuizCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TrueFalsePercentage",
                table: "QuizCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InputPercentage",
                table: "QuizCategories");

            migrationBuilder.DropColumn(
                name: "MultipleChoicePercentage",
                table: "QuizCategories");

            migrationBuilder.DropColumn(
                name: "SingleChoicePercentage",
                table: "QuizCategories");

            migrationBuilder.DropColumn(
                name: "TrueFalsePercentage",
                table: "QuizCategories");
        }
    }
}
