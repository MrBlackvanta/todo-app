using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TodoApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveToOwnSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "todo");

            migrationBuilder.RenameTable(
                name: "Lists",
                newName: "Lists",
                newSchema: "todo");

            migrationBuilder.RenameTable(
                name: "Items",
                newName: "Items",
                newSchema: "todo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "Lists",
                schema: "todo",
                newName: "Lists");

            migrationBuilder.RenameTable(
                name: "Items",
                schema: "todo",
                newName: "Items");
        }
    }
}
