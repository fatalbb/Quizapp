using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Common.Models;
using QuizApp.Application.Features.Auth.Queries.GetCurrentUser;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Users.Queries.GetUsers;

public record GetUsersQuery(int PageNumber = 1, int PageSize = 10, UserRole? RoleFilter = null) : IRequest<PaginatedList<UserDto>>;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, PaginatedList<UserDto>>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ICurrentUserService _currentUserService;

    public GetUsersQueryHandler(UserManager<ApplicationUser> userManager, ICurrentUserService currentUserService)
    {
        _userManager = userManager;
        _currentUserService = currentUserService;
    }

    public async Task<PaginatedList<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _userManager.Users.AsQueryable();

        // Teachers can only see students they created
        if (_currentUserService.Role == UserRole.Teacher)
        {
            query = query.Where(u => u.Role == UserRole.Student && u.CreatedById == _currentUserService.UserId);
        }

        if (request.RoleFilter.HasValue)
            query = query.Where(u => u.Role == request.RoleFilter.Value);

        var projected = query.Select(u => new UserDto
        {
            Id = u.Id,
            Email = u.Email!,
            FirstName = u.FirstName,
            LastName = u.LastName,
            Role = u.Role.ToString(),
            IsActive = u.IsActive
        });

        return await PaginatedList<UserDto>.CreateAsync(projected, request.PageNumber, request.PageSize);
    }
}
