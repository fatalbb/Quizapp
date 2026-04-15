namespace QuizApp.Domain.Entities;

public class QuizCategory
{
    public Guid QuizId { get; set; }
    public Guid CategoryId { get; set; }
    public int QuestionCount { get; set; }
    public int EasyPercentage { get; set; } = 34;
    public int MediumPercentage { get; set; } = 33;
    public int HardPercentage { get; set; } = 33;

    public Quiz Quiz { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
