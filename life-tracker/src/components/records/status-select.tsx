"use client";

export function StatusSelect({
  action,
  idName,
  id,
  status,
}: {
  action: (formData: FormData) => void | Promise<void>;
  idName: string;
  id: string;
  status: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name={idName} value={id} />
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          name="status"
          defaultValue={status}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </label>
    </form>
  );
}
