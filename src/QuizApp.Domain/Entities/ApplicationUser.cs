using Microsoft.AspNetCore.Identity;
using QuizApp.Domain.Enums;

namespace QuizApp.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedById { get; set; }

    public ApplicationUser? CreatedBy { get; set; }
    public ICollection<Question> CreatedQuestions { get; set; } = [];
    public ICollection<Quiz> CreatedQuizzes { get; set; } = [];
    public ICollection<QuizAttempt> QuizAttempts { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
