using QuizApp.Domain.Enums;

namespace QuizApp.Application.Common.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    UserRole? Role { get; }
}
