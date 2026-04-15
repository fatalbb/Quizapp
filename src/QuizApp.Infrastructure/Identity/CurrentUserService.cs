using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Enums;

namespace QuizApp.Infrastructure.Identity;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);

    public UserRole? Role
    {
        get
        {
            var roleStr = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(roleStr, out var role) ? role : null;
        }
    }
}
