using QuizApp.Domain.Common;

namespace QuizApp.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public string CreatedById { get; set; } = string.Empty;

    public Category? ParentCategory { get; set; }
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<Category> SubCategories { get; set; } = [];
    public ICollection<Question> Questions { get; set; } = [];
    public ICollection<QuizCategory> QuizCategories { get; set; } = [];
}
