const escapeHtml = (value) => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

exports.verificationEmail = (code, purpose) => {
    const messages = {
        register: ['Welcome to the collection.', 'verify your email and complete your account'],
        login: ['Welcome back.', 'finish signing in to your collector account'],
        reset: ['A fresh start.', 'reset your account password'],
        email: ['Your new address.', 'confirm your new email address']
    };
    const [heading, action] = messages[purpose] || ['Verify your request.', 'confirm your account request'];
    const safeCode = escapeHtml(code);
    const text = `GALLERY NOIR\nPONGOLA · ZA\n\n${heading}\n\nUse the verification code below to ${action}.\n\n${code}\n\nThis code expires in 10 minutes and can only be used once.\nEnter it on the Gallery Noir page where you requested it.\n\nKeep this code private. Gallery Noir will never ask you to share it by email or phone.\nIf you did not request this code, do not share it. You can ignore this email.\n\nGallery Noir — Your private collector space.`;
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>Gallery Noir verification</title></head>
<body style="margin:0;padding:0;background-color:#262820;color:#ebe7dc;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your Gallery Noir verification code is ready. Valid for 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#262820" style="background-color:#262820;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border:1px solid #505044;background-color:#181914;" bgcolor="#181914">
<tr><td style="padding:28px 24px;border-bottom:1px solid #414236;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" height="44" align="center" style="border:1px solid #dcb677;color:#dcb677;font-family:Georgia,'Times New Roman',serif;font-size:17px;">GN</td>
<td style="padding-left:14px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:bold;color:#ebe7dc;">Gallery Noir</span><br><span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:22px;letter-spacing:2px;color:#bcb8a9;">PONGOLA · ZA</span></td>
</tr></table></td></tr>
<tr><td style="padding:36px 24px 16px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 18px;color:#dcb677;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;">COLLECTOR ACCESS</p>
<h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:42px;font-weight:normal;color:#ebe7dc;">${heading}</h1>
<p style="margin:0;font-size:16px;line-height:26px;color:#c8c4b6;">Use the verification code below to ${action}.</p>
</td></tr>
<tr><td style="padding:12px 24px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#27291f" style="background-color:#27291f;border:1px solid #87734e;"><tr><td align="center" style="padding:24px 8px;">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;letter-spacing:2px;color:#c8c4b6;">YOUR VERIFICATION CODE</p>
<p style="margin:0;font-family:'Courier New',monospace;font-size:36px;line-height:46px;font-weight:bold;letter-spacing:6px;color:#edc98b;white-space:nowrap;">${safeCode}</p>
<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#c8c4b6;">Valid for 10 minutes · One use only</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 32px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 24px;font-size:14px;line-height:23px;color:#c8c4b6;">Enter this code on the Gallery Noir page where you requested it.</p>
<p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#ebe7dc;"><strong>Keep your code private.</strong></p>
<p style="margin:0;font-size:13px;line-height:22px;color:#bcb8a9;">Gallery Noir will never ask you to share it by email or phone. If you did not request this code, do not share it. You can ignore this email.</p>
</td></tr>
<tr><td style="padding:22px 24px;border-top:1px solid #414236;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#dcb677;">Your private collector space.</p>
<p style="margin:8px 0 0;font-size:11px;line-height:19px;color:#bcb8a9;">Gallery Noir · Account security</p>
</td></tr></table>
</td></tr></table></body></html>`;
    return { text, html };
};
