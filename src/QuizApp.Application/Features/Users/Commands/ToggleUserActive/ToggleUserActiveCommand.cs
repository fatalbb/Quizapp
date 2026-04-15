using MediatR;
using Microsoft.AspNetCore.Identity;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Models;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Users.Commands.ToggleUserActive;

public record ToggleUserActiveCommand(string UserId) : IRequest<Result<bool>>;

public class ToggleUserActiveCommandHandler : IRequestHandler<ToggleUserActiveCommand, Result<bool>>
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ToggleUserActiveCommandHandler(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<Result<bool>> Handle(ToggleUserActiveCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId)
            ?? throw new NotFoundException(nameof(ApplicationUser), request.UserId);

        user.IsActive = !user.IsActive;
        await _userManager.UpdateAsync(user);

        return Result<bool>.Success(user.IsActive);
    }
}
