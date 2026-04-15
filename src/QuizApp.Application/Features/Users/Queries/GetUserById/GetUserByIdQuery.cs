using MediatR;
using Microsoft.AspNetCore.Identity;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Features.Auth.Queries.GetCurrentUser;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Users.Queries.GetUserById;

public record GetUserByIdQuery(string UserId) : IRequest<UserDto>;

public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto>
{
    private readonly UserManager<ApplicationUser> _userManager;

    public GetUserByIdQueryHandler(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<UserDto> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId)
            ?? throw new NotFoundException(nameof(ApplicationUser), request.UserId);

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString()
        };
    }
}
