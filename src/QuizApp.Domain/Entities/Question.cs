using QuizApp.Domain.Common;
using QuizApp.Domain.Enums;

namespace QuizApp.Domain.Entities;

public class Question : BaseEntity
{
    public string? Text { get; set; }
    public QuestionType QuestionType { get; set; }
    public QuestionContentType ContentType { get; set; }
    public DifficultyLevel DifficultyLevel { get; set; }
    public Guid CategoryId { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public bool IsAiGenerated { get; set; }
    public bool IsActive { get; set; } = true;

    public Category Category { get; set; } = null!;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<Answer> Answers { get; set; } = [];
    public ICollection<QuestionMedia> Media { get; set; } = [];
}
