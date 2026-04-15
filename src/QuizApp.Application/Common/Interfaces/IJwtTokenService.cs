using QuizApp.Domain.Entities;

namespace QuizApp.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string GenerateAccessToken(ApplicationUser user);
    RefreshToken GenerateRefreshToken(string userId);
}
